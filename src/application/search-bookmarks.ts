import type { CoverItem } from '../domain/cover'

export function searchBookmarks(items: readonly CoverItem[], query: string): readonly CoverItem[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (normalizedQuery === '') return items

  return items.filter((item) =>
    [item.title, item.subtitle, item.url].some((value) =>
      value.toLocaleLowerCase().includes(normalizedQuery),
    ),
  )
}
