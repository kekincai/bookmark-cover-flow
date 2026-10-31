import type { CoverItem } from '../../domain/cover'

export interface BookmarkMetaView {
  readonly element: HTMLElement
  render(item: CoverItem | undefined): void
}

/** Title and "site · folder" under the centered cover. */
export function createBookmarkMeta(className = ''): BookmarkMetaView {
  const element = document.createElement('div')
  element.className = `bookmark-meta ${className}`.trim()
  element.setAttribute('aria-live', 'polite')
  element.setAttribute('aria-atomic', 'true')
  const title = document.createElement('h2')
  title.className = 'bookmark-meta__title'
  const subtitle = document.createElement('p')
  subtitle.className = 'bookmark-meta__subtitle'
  element.append(title, subtitle)
  let renderedKey: string | undefined

  return {
    element,
    render(item): void {
      const key = item === undefined ? '' : `${item.bookmarkId}:${item.folderTitle}`
      if (key === renderedKey) return
      renderedKey = key
      element.hidden = item === undefined
      title.textContent = item?.title ?? ''
      subtitle.textContent =
        item === undefined
          ? ''
          : item.folderTitle
            ? `${item.subtitle} · ${item.folderTitle}`
            : item.subtitle
    },
  }
}
