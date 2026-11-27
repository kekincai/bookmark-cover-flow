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
  if (mode === 'title')
    return bookmarks.toSorted((left, right) => collator.compare(left.title, right.title))
  if (mode === 'recent') {
    return bookmarks.toSorted(
      (left, right) => (recentOpenedAt.get(right.id) ?? 0) - (recentOpenedAt.get(left.id) ?? 0),
    )
  }
  // Parse every URL once, not twice per comparison.
  const hosts = new Map(bookmarks.map((bookmark) => [bookmark, hostname(bookmark.url)]))
  return bookmarks.toSorted((left, right) => {
    const domainOrder = collator.compare(hosts.get(left) ?? '', hosts.get(right) ?? '')
    return domainOrder === 0 ? collator.compare(left.title, right.title) : domainOrder
  })
}
