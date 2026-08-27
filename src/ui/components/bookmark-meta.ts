import type { CoverItem } from '../../domain/cover'
import { t } from '../../shared/i18n'

export interface BookmarkMetaView {
  readonly element: HTMLElement
  render(item: CoverItem | undefined, emptyMessage?: string): void
}

export function createBookmarkMeta(): BookmarkMetaView {
  const element = document.createElement('section')
  element.className = 'bookmark-meta'
  element.setAttribute('aria-live', 'polite')
  element.setAttribute('aria-atomic', 'true')
  const title = document.createElement('h1')
  const subtitle = document.createElement('p')
  element.append(title, subtitle)
  let renderedKey = ''

  return {
    element,
    render(item, emptyMessage = t('noBookmarks')): void {
      const key = item === undefined ? `empty:${emptyMessage}` : item.bookmarkId
      if (key === renderedKey) return
      renderedKey = key
      title.textContent = item?.title ?? emptyMessage
      subtitle.textContent = item?.subtitle ?? t('tryFolder')
      element.dataset.empty = String(item === undefined)
    },
  }
}
