import { describe, expect, it } from 'vitest'
import { findFolder, getFolderBreadcrumbs } from '../../src/application/bookmark-folders'
import type { BookmarkFolder } from '../../src/domain/bookmark'

const folders: readonly BookmarkFolder[] = [
  {
    id: 'root',
    title: 'Bookmarks bar',
    children: [],
    folders: [{ id: 'child', parentId: 'root', title: 'Design', children: [], folders: [] }],
  },
]

describe('bookmark folder hierarchy', () => {
  it('finds nested folders', () => {
    expect(findFolder(folders, 'child')?.title).toBe('Design')
  })

  it('builds breadcrumbs from root to the active folder', () => {
    expect(getFolderBreadcrumbs(folders, 'child').map((folder) => folder.title)).toEqual([
      'Bookmarks bar',
      'Design',
    ])
  })
})
