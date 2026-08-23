import {
  defaultPreferences,
  type Preferences,
  type SortMode,
  type ThemeMode,
} from '../../domain/preferences'

const key = 'bookmark-cover-flow-preferences'

const sortModes: readonly SortMode[] = ['bookmark', 'title', 'domain', 'recent']
const themeModes: readonly ThemeMode[] = ['system', 'light', 'dark']

function parsePreferences(value: unknown): Preferences {
  if (typeof value !== 'object' || value === null) return defaultPreferences
  const activeFolderId =
    'activeFolderId' in value && typeof value.activeFolderId === 'string'
      ? value.activeFolderId
      : undefined
  const showReflection =
    'showReflection' in value && typeof value.showReflection === 'boolean'
      ? value.showReflection
      : defaultPreferences.showReflection
  const sortMode =
    'sortMode' in value && sortModes.includes(value.sortMode as SortMode)
      ? (value.sortMode as SortMode)
      : defaultPreferences.sortMode
  const theme =
    'theme' in value && themeModes.includes(value.theme as ThemeMode)
      ? (value.theme as ThemeMode)
      : defaultPreferences.theme
  return {
    ...(activeFolderId === undefined ? {} : { activeFolderId }),
    showReflection,
    sortMode,
    theme,
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
