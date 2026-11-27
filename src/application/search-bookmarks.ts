import type { CoverItem } from '../domain/cover'

/** Lower-cased search text, computed once per cover instead of on every keystroke. */
const haystacks = new WeakMap<CoverItem, string>()

function haystack(item: CoverItem): string {
  let text = haystacks.get(item)
  if (text === undefined) {
    // U+0000 never appears in a query, so a match cannot span two fields.
    text = [item.title, item.subtitle, item.url, item.folderTitle]
      .join('\u0000')
      .toLocaleLowerCase()
    haystacks.set(item, text)
  }
  return text
}

export function searchBookmarks(items: readonly CoverItem[], query: string): readonly CoverItem[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (normalizedQuery === '') return items
  return items.filter((item) => haystack(item).includes(normalizedQuery))
}
