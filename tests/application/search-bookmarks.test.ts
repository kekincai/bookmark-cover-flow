import { describe, expect, it } from 'vitest'
import { searchBookmarks } from '../../src/application/search-bookmarks'
import type { CoverItem } from '../../src/domain/cover'

const covers: readonly CoverItem[] = [
  {
    bookmarkId: '1',
    title: 'Design Notes',
    subtitle: 'notion.so',
    url: 'https://notion.so/design',
    fallbackKind: 'generated',
    accent: '#000',
  },
  {
    bookmarkId: '2',
    title: 'Code',
    subtitle: 'github.com',
    url: 'https://github.com/example',
    fallbackKind: 'generated',
    accent: '#000',
  },
]

describe('searchBookmarks', () => {
  it('searches title, hostname, and URL case-insensitively', () => {
    expect(searchBookmarks(covers, 'DESIGN')).toHaveLength(1)
    expect(searchBookmarks(covers, 'github.com')).toHaveLength(1)
    expect(searchBookmarks(covers, '/example')).toHaveLength(1)
  })

  it('returns the original collection for a blank query', () => {
    expect(searchBookmarks(covers, '   ')).toBe(covers)
  })
})
