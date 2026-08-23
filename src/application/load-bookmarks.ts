import type { BookmarkFolder, BookmarkRepository } from '../domain/bookmark'

export async function loadBookmarks(repository: BookmarkRepository): Promise<readonly BookmarkFolder[]> {
  const folders = await repository.getTree()
  return folders.filter((folder) => folder.children.length > 0)
}
