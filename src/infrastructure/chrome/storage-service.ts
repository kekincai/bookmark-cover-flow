import {
  defaultPreferences,
  MAX_COVER_ANGLE,
  MIN_COVER_ANGLE,
  type Preferences,
  type SortMode,
  type ThemeMode,
  type ViewMode,
} from '../../domain/preferences'

const key = 'bookmark-cover-flow-preferences'

const sortModes: readonly SortMode[] = ['bookmark', 'title', 'domain', 'recent']
const themeModes: readonly ThemeMode[] = ['system', 'light', 'dark']
const viewModes: readonly ViewMode[] = ['coverflow', 'grid', 'list']

export function parsePreferences(value: unknown): Preferences {
  if (typeof value !== 'object' || value === null) return defaultPreferences
  const record = value as Record<string, unknown>
  const boolean = (name: keyof Preferences, fallback: boolean): boolean =>
    typeof record[name] === 'boolean' ? record[name] : fallback
  const activeFolderId =
    typeof record.activeFolderId === 'string' ? record.activeFolderId : undefined
  const sortMode = sortModes.includes(record.sortMode as SortMode)
    ? (record.sortMode as SortMode)
    : defaultPreferences.sortMode
  const theme = themeModes.includes(record.theme as ThemeMode)
    ? (record.theme as ThemeMode)
    : defaultPreferences.theme
  const coverAngle =
    typeof record.coverAngle === 'number' && Number.isFinite(record.coverAngle)
      ? Math.round(Math.min(MAX_COVER_ANGLE, Math.max(MIN_COVER_ANGLE, record.coverAngle)))
      : defaultPreferences.coverAngle
  return {
    ...(activeFolderId === undefined ? {} : { activeFolderId }),
    showReflection: boolean('showReflection', defaultPreferences.showReflection),
    sortMode,
    theme,
    preferPreviewImages: boolean('preferPreviewImages', defaultPreferences.preferPreviewImages),
    coverAngle,
    reduceFlipMotion: boolean('reduceFlipMotion', defaultPreferences.reduceFlipMotion),
    view: viewModes.includes(record.view as ViewMode)
      ? (record.view as ViewMode)
      : defaultPreferences.view,
  }
}

export async function loadPreferences(): Promise<Preferences> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local !== undefined) {
    const result = await chrome.storage.local.get(key)
    const value: unknown = result[key]
    return parsePreferences(value)
  }
  try {
    const value = localStorage.getItem(key)
    if (value === null) return defaultPreferences
    const parsed: unknown = JSON.parse(value)
    return parsePreferences(parsed)
  } catch (error) {
    console.warn('Unable to read saved preferences.', error)
    return defaultPreferences
  }
}

export async function savePreferences(preferences: Preferences): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local !== undefined) {
    await chrome.storage.local.set({ [key]: preferences })
    return
  }
  localStorage.setItem(key, JSON.stringify(preferences))
}
