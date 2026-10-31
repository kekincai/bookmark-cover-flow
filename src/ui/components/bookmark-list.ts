import type { CoverItem } from '../../domain/cover'
import { formatAddedDate, formatLastOpened } from '../../shared/format-date'
import { currentLocale, t, type MessageKey } from '../../shared/i18n'

export interface BookmarkListView {
  readonly element: HTMLElement
  /** `lastOpened` is keyed by bookmark id → epoch ms. */
  setItems(
    items: readonly CoverItem[],
    query: string,
    lastOpened: ReadonlyMap<string, number>,
  ): void
  /** Called every animation frame; a no-op unless the index changed. */
  setSelected(index: number): void
  onSelect(listener: (index: number) => void): void
  onOpen(listener: (index: number, background: boolean) => void): void
  destroy(): void
}

export const LIST_ROW_HEIGHT = 32
const HEADER_HEIGHT = 32
const BODY_PADDING_TOP = 4
const PAGE_STEP = 10
const DEFAULT_OVERSCAN = 8
/** Keyboard steps build on the last requested index until the stage catches up with it. */
const PENDING_TARGET_MS = 600

/** Rows `first..last` (inclusive) to render; `last < first` when there is nothing to show. */
export function getListWindow(
  scrollTop: number,
  viewportHeight: number,
  rowHeight: number,
  count: number,
  overscan = DEFAULT_OVERSCAN,
): { first: number; last: number } {
  if (count <= 0 || rowHeight <= 0) return { first: 0, last: -1 }
  const top = Math.max(0, scrollTop)
  const bottom = top + Math.max(0, viewportHeight)
  const first = Math.min(count - 1, Math.max(0, Math.floor(top / rowHeight) - overscan))
  const last = Math.min(count - 1, Math.max(first, Math.ceil(bottom / rowHeight) - 1 + overscan))
  return { first, last }
}

const columns: readonly { key: MessageKey | null; className: string }[] = [
  { key: null, className: 'bookmark-list__cell--number' },
  { key: 'columnName', className: 'bookmark-list__cell--name' },
  { key: 'columnSite', className: 'bookmark-list__cell--site' },
  { key: 'columnFolder', className: 'bookmark-list__cell--folder' },
  { key: 'columnAdded', className: 'bookmark-list__cell--added' },
  { key: 'columnLastOpened', className: 'bookmark-list__cell--opened' },
]

interface RowView {
  readonly element: HTMLElement
  readonly number: HTMLElement
  readonly tile: HTMLElement
  readonly title: HTMLElement
  readonly site: HTMLElement
  readonly folder: HTMLElement
  readonly added: HTMLElement
  readonly opened: HTMLElement
  index: number
  generation: number
}

let instanceCount = 0

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Replace the element's content with `text`, wrapping case-insensitive matches in <mark>. */
function fillHighlighted(element: HTMLElement, text: string, pattern: RegExp | null): void {
  if (!pattern) {
    element.textContent = text
    return
  }
  const nodes: Node[] = []
  let cursor = 0
  pattern.lastIndex = 0
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    if (match[0] === '') {
      pattern.lastIndex += 1
      continue
    }
    if (match.index > cursor) nodes.push(document.createTextNode(text.slice(cursor, match.index)))
    const mark = document.createElement('mark')
    mark.textContent = match[0]
    nodes.push(mark)
    cursor = match.index + match[0].length
  }
  if (nodes.length === 0) {
    element.textContent = text
    return
  }
  if (cursor < text.length) nodes.push(document.createTextNode(text.slice(cursor)))
  element.replaceChildren(...nodes)
}

function cell(className: string, secondary = false): HTMLElement {
  const element = document.createElement('div')
  element.className = `bookmark-list__cell ${className}${secondary ? ' bookmark-list__cell--secondary' : ''}`
  element.setAttribute('role', 'gridcell')
  return element
}

export function createBookmarkList(): BookmarkListView {
  const idPrefix = `bookmark-list-${++instanceCount}`
  const locale = currentLocale()

  const element = document.createElement('section')
  element.className = 'bookmark-list'
  element.setAttribute('aria-label', t('bookmarkList'))

  const grid = document.createElement('div')
  grid.className = 'bookmark-list__grid'
  grid.tabIndex = 0
  grid.setAttribute('role', 'grid')
  grid.setAttribute('aria-label', t('bookmarkList'))
  grid.setAttribute('aria-rowcount', '1')
  grid.setAttribute('aria-colcount', String(columns.length))

  const inner = document.createElement('div')
  inner.className = 'bookmark-list__inner'
  inner.setAttribute('role', 'presentation')

  const headerGroup = document.createElement('div')
  headerGroup.className = 'bookmark-list__header'
  headerGroup.setAttribute('role', 'rowgroup')
  const header = document.createElement('div')
  header.className = 'bookmark-list__row bookmark-list__row--header'
  header.setAttribute('role', 'row')
  header.setAttribute('aria-rowindex', '1')
  for (const column of columns) {
    const heading = document.createElement('div')
    heading.className = `bookmark-list__cell ${column.className}`
    heading.setAttribute('role', 'columnheader')
    heading.textContent = column.key ? t(column.key) : '#'
    header.append(heading)
  }
  headerGroup.append(header)

  const body = document.createElement('div')
  body.className = 'bookmark-list__body'
  body.setAttribute('role', 'rowgroup')

  inner.append(headerGroup, body)
  grid.append(inner)
  element.append(grid)

  let items: readonly CoverItem[] = []
  let lastOpened: ReadonlyMap<string, number> = new Map()
  let pattern: RegExp | null = null
  let now = Date.now()
  let generation = 0
  let selected = -1
  let pendingTarget: { index: number; at: number } | null = null
  const rendered = new Map<number, RowView>()
  const pool: RowView[] = []
  let selectListener: (index: number) => void = () => undefined
  let openListener: (index: number, background: boolean) => void = () => undefined

  const rowId = (index: number): string => `${idPrefix}-row-${index}`

  const createRow = (): RowView => {
    const row = document.createElement('div')
    row.className = 'bookmark-list__row'
    row.setAttribute('role', 'row')
    const number = cell('bookmark-list__cell--number', true)
    const name = cell('bookmark-list__cell--name')
    const tile = document.createElement('span')
    tile.className = 'bookmark-list__tile'
    tile.setAttribute('aria-hidden', 'true')
    const title = document.createElement('span')
    title.className = 'bookmark-list__title'
    name.append(tile, title)
    const site = cell('bookmark-list__cell--site', true)
    const folder = cell('bookmark-list__cell--folder', true)
    const added = cell('bookmark-list__cell--added', true)
    const opened = cell('bookmark-list__cell--opened', true)
    row.append(number, name, site, folder, added, opened)
    return {
      element: row,
      number,
      tile,
      title,
      site,
      folder,
      added,
      opened,
      index: -1,
      generation: -1,
    }
  }

  const applySelection = (view: RowView): void => {
    const isSelected = view.index === selected
    view.element.classList.toggle('is-selected', isSelected)
    view.element.setAttribute('aria-selected', String(isSelected))
  }

  const fillRow = (view: RowView, index: number): void => {
    const item = items[index]
    if (!item) return
    view.index = index
    view.generation = generation
    const row = view.element
    row.id = rowId(index)
    row.dataset.index = String(index)
    row.style.transform = `translateY(${index * LIST_ROW_HEIGHT}px)`
    row.setAttribute('aria-rowindex', String(index + 2))
    row.classList.toggle('is-alternate', index % 2 === 1)
    view.number.textContent = String(index + 1)
    view.tile.textContent = Array.from(item.art.glyph).slice(0, 2).join('')
    view.tile.style.background = item.art.background
    view.tile.style.color = item.art.foreground
    fillHighlighted(view.title, item.title, pattern)
    fillHighlighted(view.site, item.subtitle, pattern)
    fillHighlighted(view.folder, item.folderTitle, pattern)
    view.added.textContent =
      item.dateAdded === undefined ? '—' : formatAddedDate(item.dateAdded, locale)
    view.opened.textContent = formatLastOpened(lastOpened.get(item.bookmarkId), now, locale)
    applySelection(view)
  }

  const syncActiveDescendant = (): void => {
    if (rendered.has(selected)) grid.setAttribute('aria-activedescendant', rowId(selected))
    else grid.removeAttribute('aria-activedescendant')
  }

  const render = (): void => {
    // The sticky header covers the top of the viewport; rows start below the body's top margin.
    const { first, last } = getListWindow(
      grid.scrollTop - BODY_PADDING_TOP,
      grid.clientHeight - HEADER_HEIGHT,
      LIST_ROW_HEIGHT,
      items.length,
    )
    for (const [index, view] of rendered) {
      if (index >= first && index <= last) continue
      rendered.delete(index)
      view.element.remove()
      pool.push(view)
    }
    const fragment = document.createDocumentFragment()
    for (let index = first; index <= last; index += 1) {
      const existing = rendered.get(index)
      if (existing) {
        if (existing.generation !== generation) fillRow(existing, index)
        continue
      }
      const view = pool.pop() ?? createRow()
      fillRow(view, index)
      rendered.set(index, view)
      fragment.append(view.element)
    }
    if (fragment.childNodes.length > 0) body.append(fragment)
    syncActiveDescendant()
  }

  /** Scroll just enough to reveal the row below the sticky header ("nearest"). */
  const revealRow = (index: number): void => {
    if (index < 0 || index >= items.length) return
    const top = BODY_PADDING_TOP + index * LIST_ROW_HEIGHT
    const visibleTop = grid.scrollTop
    const visibleBottom = grid.scrollTop + grid.clientHeight - HEADER_HEIGHT
    let next = visibleTop
    if (top < visibleTop) next = index === 0 ? 0 : top
    else if (top + LIST_ROW_HEIGHT > visibleBottom) {
      next = top + LIST_ROW_HEIGHT - (grid.clientHeight - HEADER_HEIGHT)
    }
    if (next !== visibleTop) grid.scrollTop = Math.max(0, next)
  }

  const setSelected = (index: number): void => {
    if (index === selected) return
    if (pendingTarget?.index === index) pendingTarget = null
    const previous = rendered.get(selected)
    selected = index
    if (previous) applySelection(previous)
    revealRow(index)
    render()
    const current = rendered.get(index)
    if (current) applySelection(current)
    syncActiveDescendant()
  }

  const requestSelect = (index: number): void => {
    const target = Math.min(items.length - 1, Math.max(0, index))
    pendingTarget = { index: target, at: performance.now() }
    revealRow(target)
    render()
    selectListener(target)
  }

  const navigationBase = (): number => {
    if (pendingTarget && performance.now() - pendingTarget.at < PENDING_TARGET_MS) {
      return pendingTarget.index
    }
    pendingTarget = null
    return Math.max(0, selected)
  }

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.isComposing || event.altKey || items.length === 0) return
    const modified = event.metaKey || event.ctrlKey
    let handled = true
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'PageUp':
      case 'PageDown':
      case 'Home':
      case 'End': {
        if (modified || event.shiftKey) {
          handled = false
          break
        }
        const base = navigationBase()
        const step = event.key.startsWith('Page') ? PAGE_STEP : 1
        const target =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? items.length - 1
              : base + (event.key.endsWith('Up') ? -step : step)
        requestSelect(target)
        break
      }
      case 'Enter':
        if (event.repeat) break
        openListener(Math.max(0, navigationBase()), modified)
        break
      default:
        handled = false
    }
    if (!handled) return
    event.preventDefault()
    event.stopPropagation()
  }

  const rowIndexFromEvent = (event: Event): number | null => {
    const target = event.target instanceof Element ? event.target : null
    const row = target?.closest<HTMLElement>('.bookmark-list__row[data-index]')
    if (!row || !body.contains(row)) return null
    const index = Number(row.dataset.index)
    return Number.isInteger(index) && index < items.length ? index : null
  }

  const handleClick = (event: MouseEvent): void => {
    const index = rowIndexFromEvent(event)
    if (index === null) return
    pendingTarget = null
    if (index !== selected) selectListener(index)
  }

  const handleDoubleClick = (event: MouseEvent): void => {
    const index = rowIndexFromEvent(event)
    if (index === null) return
    openListener(index, event.metaKey || event.ctrlKey)
  }

  let frame = 0
  const scheduleRender = (): void => {
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      render()
    })
  }
  const resizeObserver = new ResizeObserver(scheduleRender)

  grid.addEventListener('scroll', render, { passive: true })
  grid.addEventListener('keydown', handleKeydown)
  body.addEventListener('click', handleClick)
  body.addEventListener('dblclick', handleDoubleClick)
  resizeObserver.observe(grid)

  return {
    element,
    setItems(nextItems, query, nextLastOpened): void {
      items = nextItems
      lastOpened = nextLastOpened
      now = Date.now()
      const needle = query.trim()
      pattern = needle ? new RegExp(escapeRegExp(needle), 'giu') : null
      generation += 1
      pendingTarget = null
      body.style.height = `${items.length * LIST_ROW_HEIGHT}px`
      grid.setAttribute('aria-rowcount', String(items.length + 1))
      if (selected >= items.length) selected = items.length - 1
      revealRow(selected)
      render()
    },
    setSelected,
    onSelect(listener): void {
      selectListener = listener
    },
    onOpen(listener): void {
      openListener = listener
    },
    destroy(): void {
      if (frame) cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      grid.removeEventListener('scroll', render)
      grid.removeEventListener('keydown', handleKeydown)
      body.removeEventListener('click', handleClick)
      body.removeEventListener('dblclick', handleDoubleClick)
      rendered.clear()
      pool.length = 0
      element.remove()
    },
  }
}
