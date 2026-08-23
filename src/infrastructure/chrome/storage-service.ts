export interface StoredPreferences {
  readonly activeFolderId?: string
  readonly showReflection?: boolean
}

const key = 'bookmark-cover-flow-preferences'

function parsePreferences(value: unknown): StoredPreferences {
  if (typeof value !== 'object' || value === null) return {}
  const activeFolderId =
    'activeFolderId' in value && typeof value.activeFolderId === 'string'
      ? value.activeFolderId
      : undefined
  const showReflection =
    'showReflection' in value && typeof value.showReflection === 'boolean'
      ? value.showReflection
      : undefined
  return {
    ...(activeFolderId === undefined ? {} : { activeFolderId }),
    ...(showReflection === undefined ? {} : { showReflection }),
  }
}

export async function loadPreferences(): Promise<StoredPreferences> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local !== undefined) {
    const result = await chrome.storage.local.get(key)
    const value: unknown = result[key]
    return parsePreferences(value)
  }
  try {
    const value = localStorage.getItem(key)
    if (value === null) return {}
    const parsed: unknown = JSON.parse(value)
    return parsePreferences(parsed)
  } catch (error) {
    console.warn('Unable to read saved preferences.', error)
    return {}
  }
}

export async function savePreferences(preferences: StoredPreferences): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local !== undefined) {
    await chrome.storage.local.set({ [key]: preferences })
    return
  }
  localStorage.setItem(key, JSON.stringify(preferences))
}
