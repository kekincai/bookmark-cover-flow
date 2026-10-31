export type SortMode = 'bookmark' | 'title' | 'domain' | 'recent'
export type ThemeMode = 'system' | 'light' | 'dark'
export type ViewMode = 'coverflow' | 'grid' | 'list'

export const MIN_COVER_ANGLE = 45
export const MAX_COVER_ANGLE = 80

export interface Preferences {
  readonly activeFolderId?: string
  readonly sortMode: SortMode
  readonly theme: ThemeMode
  readonly showReflection: boolean
  /** When off, no website is contacted and every cover is generated locally. */
  readonly preferPreviewImages: boolean
  readonly coverAngle: number
  readonly reduceFlipMotion: boolean
  readonly view: ViewMode
}

export const defaultPreferences: Preferences = {
  sortMode: 'bookmark',
  theme: 'light',
  showReflection: true,
  preferPreviewImages: true,
  coverAngle: 70,
  reduceFlipMotion: false,
  view: 'coverflow',
}
