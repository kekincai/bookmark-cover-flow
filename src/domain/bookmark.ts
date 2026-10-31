export interface Bookmark {
  readonly id: string
  readonly title: string
  readonly url: string
  readonly parentId?: string
  readonly dateAdded?: number
}

export interface BookmarkRepository {
  getTree(): Promise<readonly BookmarkFolder[]>
}

export interface BookmarkFolder {
  readonly id: string
  readonly title: string
  readonly parentId?: string
  readonly children: readonly Bookmark[]
  readonly folders: readonly BookmarkFolder[]
}
