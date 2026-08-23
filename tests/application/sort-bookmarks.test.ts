import { describe, expect, it } from 'vitest'
import { sortBookmarks } from '../../src/application/sort-bookmarks'
import type { Bookmark } from '../../src/domain/bookmark'

const bookmarks: readonly Bookmark[] = [
  { id: '2', title: 'Zebra', url: 'https://alpha.example/zebra' },
  { id: '1', title: 'apple', url: 'https://zeta.example/apple' },
  { id: '3', title: 'Article 10', url: 'https://alpha.example/ten' },
  { id: '4', title: 'Article 2', url: 'https://alpha.example/two' },
]

describe('sortBookmarks', () => {
  it('preserves Chrome bookmark order by default', () => {
    expect(sortBookmarks(bookmarks, 'bookmark')).toBe(bookmarks)
  })

  it('sorts titles naturally and case-insensitively', () => {
    expect(sortBookmarks(bookmarks, 'title').map((item) => item.title)).toEqual([
      'apple',
      'Article 2',
      'Article 10',
      'Zebra',
    ])
  })

  it('sorts by website and then title', () => {
    expect(sortBookmarks(bookmarks, 'domain').map((item) => item.id)).toEqual(['4', '3', '2', '1'])
  })

  it('puts recently opened bookmarks first', () => {
    const recent = new Map([
      ['1', 100],
      ['3', 200],
    ])
    expect(sortBookmarks(bookmarks, 'recent', recent).map((item) => item.id)).toEqual([
      '3',
      '1',
      '2',
      '4',
    ])
  })
})
