import { describe, expect, it } from 'vitest'
import { mapChromeTree } from '../../src/infrastructure/chrome/bookmark-repository'

describe('mapChromeTree', () => {
  it('maps top-level folders and recursively flattens nested bookmarks', () => {
    const result = mapChromeTree([
      {
        id: '0',
        title: '',
        children: [
          {
            id: '1',
            title: 'Bookmarks bar',
            children: [
              { id: '2', parentId: '1', title: 'Example', url: 'https://example.com' },
              {
                id: '3',
                title: 'Nested',
                children: [
                  { id: '4', parentId: '3', title: 'Deep', url: 'https://example.org' },
                ],
              },
            ],
          },
        ],
      },
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.title).toBe('Bookmarks bar')
    expect(result[0]?.children.map((bookmark) => bookmark.title)).toEqual(['Example', 'Deep'])
  })
})
