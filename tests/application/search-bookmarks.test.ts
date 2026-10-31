import { describe, expect, it } from 'vitest'
import { searchBookmarks } from '../../src/application/search-bookmarks'
import { coverItem } from '../support/cover-item'

const covers = [
  coverItem({
    bookmarkId: '1',
    title: 'Design Notes',
    subtitle: 'notion.so',
    url: 'https://notion.so/design',
    folderTitle: 'Reading',
  }),
  coverItem({
    bookmarkId: '2',
    title: 'Code',
    subtitle: 'github.com',
    url: 'https://github.com/example',
    folderTitle: 'Development',
  }),
]

describe('searchBookmarks', () => {
  it('searches title, hostname, URL and folder case-insensitively', () => {
    expect(searchBookmarks(covers, 'DESIGN')).toHaveLength(1)
    expect(searchBookmarks(covers, 'github.com')).toHaveLength(1)
    expect(searchBookmarks(covers, '/example')).toHaveLength(1)
    expect(searchBookmarks(covers, 'develop')).toHaveLength(1)
  })

  it('returns the original collection for a blank query', () => {
    expect(searchBookmarks(covers, '   ')).toBe(covers)
  })
})
