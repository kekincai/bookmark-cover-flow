export interface Bookmark {
  readonly id: string
  readonly title: string
  readonly url: string
  readonly parentId?: string
}

export interface BookmarkRepository {
  getTree(): Promise<readonly BookmarkFolder[]>
}

export interface BookmarkFolder {
  readonly id: string
  readonly title: string
  readonly children: readonly Bookmark[]
}
