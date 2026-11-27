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

/** The tree is immutable once loaded; repeat calls for the same tree reuse one flattened list. */
const allBookmarks = new WeakMap<readonly BookmarkFolder[], readonly FiledBookmark[]>()

/** Every bookmark in tree order, each labelled with the folder that holds it. */
export function listAllBookmarks(folders: readonly BookmarkFolder[]): readonly FiledBookmark[] {
  let bookmarks = allBookmarks.get(folders)
  if (bookmarks === undefined) {
    bookmarks = flattenFolders(folders).flatMap(fileBookmarks)
    allBookmarks.set(folders, bookmarks)
  }
  return bookmarks
}

const recentlyAdded = new WeakMap<readonly FiledBookmark[], Map<number, readonly FiledBookmark[]>>()

/** Newest `limit` bookmarks; one partial selection pass instead of sorting the whole library. */
export function listRecentlyAdded(
  bookmarks: readonly FiledBookmark[],
  limit: number,
): readonly FiledBookmark[] {
  const cached = recentlyAdded.get(bookmarks)?.get(limit)
  if (cached !== undefined) return cached
  const newest: FiledBookmark[] = []
  for (const bookmark of bookmarks) {
    if (bookmark.dateAdded === undefined) continue
    if (newest.length === limit && bookmark.dateAdded <= (newest.at(-1)?.dateAdded ?? 0)) continue
    const at = newest.findIndex((entry) => (entry.dateAdded ?? 0) < (bookmark.dateAdded ?? 0))
    newest.splice(at === -1 ? newest.length : at, 0, bookmark)
    if (newest.length > limit) newest.pop()
  }
  const perLimit = recentlyAdded.get(bookmarks) ?? new Map<number, readonly FiledBookmark[]>()
  perLimit.set(limit, newest)
  recentlyAdded.set(bookmarks, perLimit)
  return newest
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
