import { BASE_COVER_SIZE } from '../../application/cover-layout'
import type { CoverArt, CoverItem } from '../../domain/cover'
import { t } from '../../shared/i18n'
import { renderCoverArt } from './cover-art-view'

export interface BookmarkGridView {
  readonly element: HTMLElement
  setItems(items: readonly CoverItem[]): void
  /** Cheap when unchanged; scrolls the selected cover into view when it changes. */
  setSelected(index: number): void
  onSelect(listener: (index: number) => void): void
  onOpen(listener: (index: number, background: boolean) => void): void
  /** Indexes currently on screen, so the caller can fetch their previews. */
  onVisibleRange(listener: (first: number, last: number) => void): void
  destroy(): void
}

export interface GridLayout {
  readonly columns: number
  readonly cellWidth: number
  readonly rowHeight: number
}

const MIN_CELL = 168
const GAP_X = 24
const GAP_Y = 28
const PADDING_X = 28
const PADDING_TOP = 20
/** Title and website lines under each cover. */
const CAPTION_HEIGHT = 44
const OVERSCAN_ROWS = 2
/** Layout before the grid has been measured (it is only measured while shown). */
const DEFAULT_WIDTH = 900

/** As many covers as fit at ≥ 168 px, stretched to fill the row exactly. */
export function getGridLayout(width: number): GridLayout {
  const available = Math.max(MIN_CELL, width - PADDING_X * 2)
  const columns = Math.max(1, Math.floor((available + GAP_X) / (MIN_CELL + GAP_X)))
  const cellWidth = Math.floor((available - GAP_X * (columns - 1)) / columns)
  return { columns, cellWidth, rowHeight: cellWidth + CAPTION_HEIGHT + GAP_Y }
}

export function getGridWindow(
  scrollTop: number,
  viewportHeight: number,
  layout: GridLayout,
  count: number,
): { readonly first: number; readonly last: number } {
  if (count === 0) return { first: 0, last: -1 }
  const top = Math.max(0, scrollTop - PADDING_TOP)
  const firstRow = Math.max(0, Math.floor(top / layout.rowHeight) - OVERSCAN_ROWS)
  const lastRow = Math.ceil((top + viewportHeight) / layout.rowHeight) + OVERSCAN_ROWS
  return {
    first: Math.min(count - 1, firstRow * layout.columns),
    last: Math.min(count - 1, (lastRow + 1) * layout.columns - 1),
  }
}

interface CellView {
  readonly element: HTMLElement
  readonly art: HTMLElement
  readonly cover: HTMLElement
  /** The single text span inside each `.truncate` caption line. */
  readonly title: HTMLElement
  readonly host: HTMLElement
  item?: CoverItem
  /** Art last drawn into `cover`; `CoverItem.art` is rebuilt on each read, so compare by value. */
  drawnArt?: CoverArt
}

function sameArt(a: CoverArt | undefined, b: CoverArt): boolean {
  return (
    a !== undefined &&
    a.template === b.template &&
    a.background === b.background &&
    a.foreground === b.foreground &&
    a.accent === b.accent &&
    a.glyph === b.glyph &&
    a.lines[0] === b.lines[0] &&
    a.lines[1] === b.lines[1]
  )
}

let instanceCount = 0

export function createBookmarkGrid(): BookmarkGridView {
  const idPrefix = `bookmark-grid-${++instanceCount}`
  // A plain wrapper: the listbox inside carries the name (no extra `region` landmark).
  const element = document.createElement('div')
  element.className = 'bookmark-grid'
  const scroller = document.createElement('div')
  scroller.className = 'bookmark-grid__scroller'
  scroller.tabIndex = 0
  scroller.setAttribute('role', 'listbox')
  scroller.setAttribute('aria-label', t('bookmarkGrid'))
  const body = document.createElement('div')
  body.className = 'bookmark-grid__body'
  scroller.append(body)
  element.append(scroller)

  let items: readonly CoverItem[] = []
  let selected = 0
  let layout = getGridLayout(DEFAULT_WIDTH)
  /** Cached so rendering never reads layout: size from ResizeObserver, offset from scroll. */
  let viewportWidth = 0
  let viewportHeight = 0
  let scrollTop = 0
  /** A new collection scrolls back to the top on the next relayout (now, or once shown). */
  let resetScroll = false
  const rendered = new Map<number, CellView>()
  const pool: CellView[] = []
  let selectListener: (index: number) => void = () => undefined
  let openListener: (index: number, background: boolean) => void = () => undefined
  let rangeListener: (first: number, last: number) => void = () => undefined
  let lastRange = ''

  /** A `.truncate` line with its text in exactly one inner <span>. */
  const captionLine = (className: string): { line: HTMLElement; text: HTMLElement } => {
    const line = document.createElement('span')
    line.className = `${className} truncate`
    const text = document.createElement('span')
    line.append(text)
    return { line, text }
  }

  const createCell = (): CellView => {
    const cell = document.createElement('div')
    cell.className = 'grid-cell'
    cell.setAttribute('role', 'option')
    const art = document.createElement('div')
    art.className = 'grid-cell__art'
    const cover = document.createElement('span')
    cover.className = 'cover-art'
    art.append(cover)
    const title = captionLine('grid-cell__title')
    const host = captionLine('grid-cell__host')
    cell.append(art, title.line, host.line)
    return { element: cell, art, cover, title: title.text, host: host.text }
  }

  const fillCell = (view: CellView, index: number): void => {
    const item = items[index]
    if (!item) return
    const cell = view.element
    cell.id = `${idPrefix}-${index}`
    cell.dataset.index = String(index)
    cell.setAttribute('aria-label', `${item.title}, ${item.subtitle}`)
    cell.setAttribute('aria-posinset', String(index + 1))
    cell.setAttribute('aria-setsize', String(items.length))
    const column = index % layout.columns
    const row = Math.floor(index / layout.columns)
    cell.style.width = `${layout.cellWidth}px`
    cell.style.transform = `translate(${PADDING_X + column * (layout.cellWidth + GAP_X)}px, ${
      PADDING_TOP + row * layout.rowHeight
    }px)`
    if (view.item !== item) {
      const art = item.art
      const sameCaption = view.item?.title === item.title && view.item.subtitle === item.subtitle
      if (!sameCaption || !sameArt(view.drawnArt, art)) {
        renderCoverArt(view.cover, art, item.title, item.subtitle)
        view.drawnArt = art
      }
      view.title.textContent = item.title
      view.host.textContent = item.subtitle
      const existing = view.art.querySelector<HTMLImageElement>('img')
      if (item.imageKind === 'preview' && item.image) {
        if (existing?.dataset.src !== item.image) {
          existing?.remove()
          const image = document.createElement('img')
          image.alt = ''
          image.draggable = false
          // Eager: only on-screen cells (plus overscan) exist, so lazy would only delay them.
          image.decoding = 'async'
          image.referrerPolicy = 'no-referrer'
          image.dataset.src = item.image
          image.addEventListener('load', () => (image.dataset.loaded = 'true'), { once: true })
          image.addEventListener('error', () => image.remove(), { once: true })
          image.src = item.image
          view.art.append(image)
        }
      } else existing?.remove()
      view.item = item
    }
    const isSelected = index === selected
    cell.classList.toggle('is-selected', isSelected)
    cell.setAttribute('aria-selected', String(isSelected))
  }

  const isShown = (): boolean => viewportWidth > 0 && viewportHeight > 0

  const visibleWindow = (): { readonly first: number; readonly last: number } =>
    getGridWindow(scrollTop, viewportHeight, layout, items.length)

  const render = (): void => {
    if (!isShown()) return
    const { first, last } = visibleWindow()
    for (const [index, view] of rendered) {
      if (index < first || index > last) {
        view.element.remove()
        rendered.delete(index)
        pool.push(view)
      }
    }
    const fragment = document.createDocumentFragment()
    for (let index = first; index <= last; index += 1) {
      const existing = rendered.get(index)
      if (existing) {
        fillCell(existing, index)
        continue
      }
      const view = pool.pop() ?? createCell()
      fillCell(view, index)
      rendered.set(index, view)
      fragment.append(view.element)
    }
    body.append(fragment)
    if (rendered.has(selected))
      scroller.setAttribute('aria-activedescendant', `${idPrefix}-${selected}`)
    else scroller.removeAttribute('aria-activedescendant')
  }

  /**
   * Tell the caller which covers are on screen so it can fetch their previews. Only once scrolling
   * has settled (`scrollend`) or the layout/items changed, never on every scroll frame.
   */
  const emitRange = (): void => {
    if (!isShown()) return
    const { first, last } = visibleWindow()
    const range = `${first}:${last}`
    if (range === lastRange || last < first) return
    lastRange = range
    rangeListener(first, last)
  }

  const scrollToOffset = (value: number): void => {
    // The resulting scroll event re-reads the real (clamped) offset.
    scrollTop = Math.max(0, value)
    scroller.scrollTop = scrollTop
  }

  const reveal = (index: number): void => {
    if (!isShown()) return
    const top = PADDING_TOP + Math.floor(index / layout.columns) * layout.rowHeight
    const bottom = top + layout.rowHeight - GAP_Y
    if (top < scrollTop) scrollToOffset(top - PADDING_TOP)
    else if (bottom > scrollTop + viewportHeight)
      scrollToOffset(bottom - viewportHeight + PADDING_TOP)
  }

  /** Only while shown: a hidden grid just keeps its items until the ResizeObserver reports a size. */
  const relayout = (): void => {
    if (!isShown()) return
    layout = getGridLayout(viewportWidth)
    element.style.setProperty('--art-scale', String(layout.cellWidth / BASE_COVER_SIZE))
    const rows = Math.ceil(items.length / layout.columns)
    body.style.height = `${PADDING_TOP + rows * layout.rowHeight}px`
    if (resetScroll) {
      resetScroll = false
      scrollToOffset(0)
    }
    // Becoming visible (the view switched to Grid) also lands here: keep the selection in sight.
    reveal(selected)
    render()
    emitRange()
  }

  const setSelected = (index: number): void => {
    if (index === selected) return
    selected = index
    // Hidden: the relayout on becoming visible reveals and renders the selection.
    if (!isShown()) return
    reveal(index)
    render()
  }

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.isComposing || event.altKey || items.length === 0) return
    const modified = event.metaKey || event.ctrlKey
    const rowsPerPage = Math.max(1, Math.floor(viewportHeight / layout.rowHeight))
    const target: number | undefined = (() => {
      if (modified || event.shiftKey) return undefined
      if (event.key === 'ArrowLeft') return selected - 1
      if (event.key === 'ArrowRight') return selected + 1
      if (event.key === 'ArrowUp') return selected - layout.columns
      if (event.key === 'ArrowDown') return selected + layout.columns
      if (event.key === 'PageUp') return selected - layout.columns * rowsPerPage
      if (event.key === 'PageDown') return selected + layout.columns * rowsPerPage
      if (event.key === 'Home') return 0
      if (event.key === 'End') return items.length - 1
      return undefined
    })()
    if (target !== undefined) {
      selectListener(Math.min(items.length - 1, Math.max(0, target)))
    } else if (event.key === 'Enter' && !event.repeat) {
      openListener(selected, modified)
    } else return
    event.preventDefault()
    event.stopPropagation()
  }

  const indexFromEvent = (event: Event): number | null => {
    const cell = (event.target as Element | null)?.closest<HTMLElement>('.grid-cell[data-index]')
    if (!cell) return null
    const index = Number(cell.dataset.index)
    return Number.isInteger(index) && index < items.length ? index : null
  }
  const handleClick = (event: MouseEvent): void => {
    const index = indexFromEvent(event)
    if (index !== null && index !== selected) selectListener(index)
  }
  const handleDoubleClick = (event: MouseEvent): void => {
    const index = indexFromEvent(event)
    if (index !== null) openListener(index, event.metaKey || event.ctrlKey)
  }

  /** Double-click opens a bookmark: keep it from also selecting a word (drag-selection still works). */
  const handleMouseDown = (event: MouseEvent): void => {
    if (event.detail > 1) event.preventDefault()
  }

  let frame = 0
  const onScroll = (): void => {
    scrollTop = scroller.scrollTop
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      render()
    })
  }
  const resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[entries.length - 1]
    if (!entry) return
    // The scroller has no padding: its content box is the scrollport (stable gutter excluded).
    viewportWidth = entry.contentRect.width
    viewportHeight = entry.contentRect.height
    if (!isShown()) return
    // Layout is fresh here; the offset may have been reset while the grid was display: none.
    scrollTop = scroller.scrollTop
    relayout()
  })
  scroller.addEventListener('scroll', onScroll, { passive: true })
  scroller.addEventListener('scrollend', emitRange)
  scroller.addEventListener('keydown', handleKeydown)
  body.addEventListener('mousedown', handleMouseDown)
  body.addEventListener('click', handleClick)
  body.addEventListener('dblclick', handleDoubleClick)
  resizeObserver.observe(scroller)

  return {
    element,
    setItems(nextItems): void {
      const changedCollection =
        nextItems.length !== items.length || nextItems[0]?.bookmarkId !== items[0]?.bookmarkId
      items = nextItems
      if (selected >= items.length) selected = Math.max(0, items.length - 1)
      if (changedCollection) {
        resetScroll = true
        lastRange = ''
      }
      relayout()
    },
    setSelected,
    onSelect(listener): void {
      selectListener = listener
    },
    onOpen(listener): void {
      openListener = listener
    },
    onVisibleRange(listener): void {
      rangeListener = listener
    },
    destroy(): void {
      if (frame) cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      scroller.removeEventListener('scroll', onScroll)
      scroller.removeEventListener('scrollend', emitRange)
      scroller.removeEventListener('keydown', handleKeydown)
      body.removeEventListener('mousedown', handleMouseDown)
      body.removeEventListener('click', handleClick)
      body.removeEventListener('dblclick', handleDoubleClick)
      element.remove()
    },
  }
}
