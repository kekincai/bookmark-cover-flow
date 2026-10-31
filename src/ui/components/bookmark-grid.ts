import { BASE_COVER_SIZE } from '../../application/cover-layout'
import type { CoverItem } from '../../domain/cover'
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
  readonly title: HTMLElement
  readonly host: HTMLElement
  item?: CoverItem
}

let instanceCount = 0

export function createBookmarkGrid(): BookmarkGridView {
  const idPrefix = `bookmark-grid-${++instanceCount}`
  const element = document.createElement('section')
  element.className = 'bookmark-grid'
  element.setAttribute('aria-label', t('bookmarkGrid'))
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
  let layout = getGridLayout(element.clientWidth || 900)
  const rendered = new Map<number, CellView>()
  const pool: CellView[] = []
  let selectListener: (index: number) => void = () => undefined
  let openListener: (index: number, background: boolean) => void = () => undefined
  let rangeListener: (first: number, last: number) => void = () => undefined
  let lastRange = ''

  const createCell = (): CellView => {
    const cell = document.createElement('div')
    cell.className = 'grid-cell'
    cell.setAttribute('role', 'option')
    const art = document.createElement('div')
    art.className = 'grid-cell__art'
    const cover = document.createElement('span')
    cover.className = 'cover-art'
    art.append(cover)
    const title = document.createElement('span')
    title.className = 'grid-cell__title'
    const host = document.createElement('span')
    host.className = 'grid-cell__host'
    cell.append(art, title, host)
    return { element: cell, art, cover, title, host }
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
      if (view.item?.art !== item.art)
        renderCoverArt(view.cover, item.art, item.title, item.subtitle)
      view.title.textContent = item.title
      view.host.textContent = item.subtitle
      const existing = view.art.querySelector<HTMLImageElement>('img')
      if (item.imageKind === 'preview' && item.image) {
        if (existing?.dataset.src !== item.image) {
          existing?.remove()
          const image = document.createElement('img')
          image.alt = ''
          image.draggable = false
          image.decoding = 'async'
          image.loading = 'lazy'
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

  const render = (): void => {
    const { first, last } = getGridWindow(
      scroller.scrollTop,
      scroller.clientHeight,
      layout,
      items.length,
    )
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
    const range = `${first}:${last}`
    if (range !== lastRange && last >= first) {
      lastRange = range
      rangeListener(first, last)
    }
  }

  const relayout = (): void => {
    layout = getGridLayout(scroller.clientWidth)
    element.style.setProperty('--art-scale', String(layout.cellWidth / BASE_COVER_SIZE))
    const rows = Math.ceil(items.length / layout.columns)
    body.style.height = `${PADDING_TOP + rows * layout.rowHeight}px`
    // Becoming visible (the view switched to Grid) also lands here: keep the selection in sight.
    reveal(selected)
    render()
  }

  const reveal = (index: number): void => {
    if (scroller.clientHeight === 0) return
    const top = PADDING_TOP + Math.floor(index / layout.columns) * layout.rowHeight
    const bottom = top + layout.rowHeight - GAP_Y
    if (top < scroller.scrollTop) scroller.scrollTop = top - PADDING_TOP
    else if (bottom > scroller.scrollTop + scroller.clientHeight)
      scroller.scrollTop = bottom - scroller.clientHeight + PADDING_TOP
  }

  const setSelected = (index: number): void => {
    if (index === selected) return
    selected = index
    reveal(index)
    render()
  }

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.isComposing || event.altKey || items.length === 0) return
    const modified = event.metaKey || event.ctrlKey
    const rowsPerPage = Math.max(1, Math.floor(scroller.clientHeight / layout.rowHeight))
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

  let frame = 0
  const onScroll = (): void => {
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      render()
    })
  }
  const resizeObserver = new ResizeObserver(relayout)
  scroller.addEventListener('scroll', onScroll, { passive: true })
  scroller.addEventListener('keydown', handleKeydown)
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
        scroller.scrollTop = 0
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
      scroller.removeEventListener('keydown', handleKeydown)
      body.removeEventListener('click', handleClick)
      body.removeEventListener('dblclick', handleDoubleClick)
      element.remove()
    },
  }
}
