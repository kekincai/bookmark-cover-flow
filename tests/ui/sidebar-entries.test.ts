import { describe, expect, it } from 'vitest'
import type { BookmarkFolder } from '../../src/domain/bookmark'
import { folderEntries } from '../../src/ui/components/sidebar'

const folder = (
  id: string,
  bookmarks: number,
  folders: readonly BookmarkFolder[] = [],
): BookmarkFolder => ({
  id,
  title: id,
  children: Array.from({ length: bookmarks }, (_, index) => ({
    id: `${id}-${index}`,
    title: `${id} ${index}`,
    url: `https://${id}.example/${index}`,
  })),
  folders,
})

describe('sidebar folder entries', () => {
  it('omits the count for folders that only hold subfolders', () => {
    const root = folder('bar', 0, [folder('library', 0, [folder('dev', 5), folder('empty', 0)])])
    expect(folderEntries(root).map((entry) => [entry.id, entry.count, entry.depth])).toEqual([
      ['library', undefined, 0],
      ['dev', 5, 1],
      ['empty', 0, 1],
    ])
  })

  it('lists a root with its own bookmarks before its subfolders', () => {
    const entries = folderEntries(folder('other', 2, [folder('later', 1)]))
    expect(entries.map((entry) => [entry.id, entry.count])).toEqual([
      ['other', 2],
      ['later', 1],
    ])
  })
})
