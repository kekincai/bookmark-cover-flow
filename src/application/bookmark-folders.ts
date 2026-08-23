import type { BookmarkFolder } from '../domain/bookmark'

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

export function getFolderBreadcrumbs(
  folders: readonly BookmarkFolder[],
  folderId: string | undefined,
): readonly BookmarkFolder[] {
  const allFolders = flattenFolders(folders)
  const byId = new Map(allFolders.map((folder) => [folder.id, folder]))
  const breadcrumbs: BookmarkFolder[] = []
  let current = folderId === undefined ? undefined : byId.get(folderId)

  while (current !== undefined) {
    breadcrumbs.unshift(current)
    current = current.parentId === undefined ? undefined : byId.get(current.parentId)
  }

  return breadcrumbs
}

export function findFirstUsableFolder(
  folders: readonly BookmarkFolder[],
): BookmarkFolder | undefined {
  return flattenFolders(folders).find(
    (folder) => folder.children.length > 0 || folder.folders.length > 0,
  )
}
