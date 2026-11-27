import type { CoverItem } from '../../domain/cover'

export interface BookmarkMetaView {
  readonly element: HTMLElement
  render(item: CoverItem | undefined): void
}

/** A single-line `.truncate` element: the text lives in its one inner <span>. */
function truncatingLine<K extends 'h2' | 'p'>(
  tag: K,
  className: string,
): { readonly element: HTMLElementTagNameMap[K]; readonly text: HTMLSpanElement } {
  const element = document.createElement(tag)
  element.className = `${className} truncate`
  const text = document.createElement('span')
  element.append(text)
  return { element, text }
}

/**
 * Title and "site · folder" under the centered cover.
 *
 * Not a live region: it re-renders while the covers are still moving, which would announce every
 * cover passed. Bootstrap announces the selection once the motion settles.
 */
export function createBookmarkMeta(className = ''): BookmarkMetaView {
  const element = document.createElement('div')
  element.className = `bookmark-meta ${className}`.trim()
  const title = truncatingLine('h2', 'bookmark-meta__title')
  const subtitle = truncatingLine('p', 'bookmark-meta__subtitle')
  element.append(title.element, subtitle.element)
  let renderedKey: string | undefined

  return {
    element,
    render(item): void {
      const key = item === undefined ? '' : `${item.bookmarkId}:${item.folderTitle}`
      if (key === renderedKey) return
      renderedKey = key
      element.hidden = item === undefined
      title.text.textContent = item?.title ?? ''
      subtitle.text.textContent =
        item === undefined
          ? ''
          : item.folderTitle
            ? `${item.subtitle} · ${item.folderTitle}`
            : item.subtitle
    },
  }
}
