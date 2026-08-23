import type { Bookmark } from './bookmark'

export interface RecentBookmark extends Bookmark {
  readonly openedAt: number
}

export const RECENT_COLLECTION_ID = '__bookmark-cover-flow-recent__'
