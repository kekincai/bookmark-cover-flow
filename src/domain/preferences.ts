export type SortMode = 'bookmark' | 'title' | 'domain' | 'recent'
export type ThemeMode = 'system' | 'light' | 'dark'

export interface Preferences {
  readonly activeFolderId?: string
  readonly sortMode: SortMode
  readonly theme: ThemeMode
  readonly showReflection: boolean
}

export const defaultPreferences: Preferences = {
  sortMode: 'bookmark',
  theme: 'system',
  showReflection: true,
}
