import { describe, expect, it } from 'vitest'
import {
  findFolder,
  folderTitleIndex,
  listAllBookmarks,
  listRecentlyAdded,
} from '../../src/application/bookmark-folders'
import type { BookmarkFolder } from '../../src/domain/bookmark'

const folders: readonly BookmarkFolder[] = [
  {
    id: 'root',
    title: 'Bookmarks bar',
    children: [{ id: 'a', title: 'A', url: 'https://a.example', dateAdded: 10 }],
    folders: [
      {
        id: 'child',
        parentId: 'root',
        title: 'Design',
        children: [
          { id: 'b', title: 'B', url: 'https://b.example', dateAdded: 30 },
          { id: 'c', title: 'C', url: 'https://c.example' },
        ],
        folders: [],
      },
    ],
  },
]

describe('bookmark collections', () => {
  it('finds nested folders', () => {
    expect(findFolder(folders, 'child')?.title).toBe('Design')
  })

  it('lists every bookmark in tree order with its folder title', () => {
    expect(
      listAllBookmarks(folders).map((bookmark) => [bookmark.id, bookmark.folderTitle]),
    ).toEqual([
      ['a', 'Bookmarks bar'],
      ['b', 'Design'],
      ['c', 'Design'],
    ])
  })

  it('orders recently added bookmarks newest first and skips undated ones', () => {
    const all = listAllBookmarks(folders)
    expect(listRecentlyAdded(all, 5).map((bookmark) => bookmark.id)).toEqual(['b', 'a'])
    expect(listRecentlyAdded(all, 1).map((bookmark) => bookmark.id)).toEqual(['b'])
  })

  it('indexes folder titles by id and URL for the recent collection', () => {
    const index = folderTitleIndex(listAllBookmarks(folders))
    expect(index.get('b')).toBe('Design')
    expect(index.get('https://a.example')).toBe('Bookmarks bar')
  })
})
