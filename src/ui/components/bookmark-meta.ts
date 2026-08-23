import type { CoverItem } from '../../domain/cover'

export interface BookmarkMetaView {
  readonly element: HTMLElement
  render(item: CoverItem | undefined, emptyMessage?: string): void
}

export function createBookmarkMeta(): BookmarkMetaView {
  const element = document.createElement('section')
  element.className = 'bookmark-meta'
  element.setAttribute('aria-live', 'polite')
  const title = document.createElement('h1')
  const subtitle = document.createElement('p')
  element.append(title, subtitle)

  return {
    element,
    render(item, emptyMessage = 'No bookmarks found'): void {
      title.textContent = item?.title ?? emptyMessage
      subtitle.textContent = item?.subtitle ?? 'Try another folder or search'
      element.dataset.empty = String(item === undefined)
    },
  }
}
