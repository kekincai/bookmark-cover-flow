import type { BookmarkFolder } from '../domain/bookmark'
import type { FiledBookmark } from './resolve-cover'

export function flattenFolders(folders: readonly BookmarkFolder[]): readonly BookmarkFolder[] {
  return folders.flatMap((folder) => [folder, ...flattenFolders(folder.folders)])
}

export function findFolder(
  folders: readonly BookmarkFolder[],
  folderId: string | undefined,
): BookmarkFolder | undefined {
  if (folderId === undefined) return undefined
  return flattenFolders(folders).find((folder) => folder.id === folderId)
}

export function findFirstUsableFolder(
  folders: readonly BookmarkFolder[],
): BookmarkFolder | undefined {
  return flattenFolders(folders).find(
    (folder) => folder.children.length > 0 || folder.folders.length > 0,
  )
}

export const fileBookmarks = (folder: BookmarkFolder): readonly FiledBookmark[] =>
  folder.children.map((bookmark) => ({ ...bookmark, folderTitle: folder.title }))

/** Every bookmark in tree order, each labelled with the folder that holds it. */
export const listAllBookmarks = (folders: readonly BookmarkFolder[]): readonly FiledBookmark[] =>
  flattenFolders(folders).flatMap(fileBookmarks)

export function listRecentlyAdded(
  bookmarks: readonly FiledBookmark[],
  limit: number,
): readonly FiledBookmark[] {
  return bookmarks
    .filter((bookmark) => bookmark.dateAdded !== undefined)
    .sort((left, right) => (right.dateAdded ?? 0) - (left.dateAdded ?? 0))
    .slice(0, limit)
}

/** Maps every bookmark id and URL to its folder title, for collections built outside the tree. */
export function folderTitleIndex(bookmarks: readonly FiledBookmark[]): ReadonlyMap<string, string> {
  const index = new Map<string, string>()
  for (const bookmark of bookmarks) {
    index.set(bookmark.id, bookmark.folderTitle)
    if (!index.has(bookmark.url)) index.set(bookmark.url, bookmark.folderTitle)
  }
  return index
}
