import type { Bookmark } from '../domain/bookmark'
import type { SortMode } from '../domain/preferences'

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

export function sortBookmarks<T extends Bookmark>(
  bookmarks: readonly T[],
  mode: SortMode,
  recentOpenedAt: ReadonlyMap<string, number> = new Map(),
): readonly T[] {
  if (mode === 'bookmark') return bookmarks

  return [...bookmarks].sort((left, right) => {
    if (mode === 'title') return collator.compare(left.title, right.title)
    if (mode === 'domain') {
      const domainOrder = collator.compare(hostname(left.url), hostname(right.url))
      return domainOrder === 0 ? collator.compare(left.title, right.title) : domainOrder
    }

    const leftOpenedAt = recentOpenedAt.get(left.id) ?? 0
    const rightOpenedAt = recentOpenedAt.get(right.id) ?? 0
    return rightOpenedAt - leftOpenedAt
  })
}
