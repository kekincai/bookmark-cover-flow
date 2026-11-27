import {
  defaultWallpaper,
  parseWallpaper,
  type WallpaperAdjustment,
  type WallpaperPreset,
  type WallpaperSettings,
} from '../domain/wallpaper'

const DATABASE = 'bookmark-cover-flow-wallpaper'
const STORE = 'wallpaper'
export interface WallpaperSnapshot {
  readonly settings: WallpaperSettings
  readonly blob: Blob | null
}

/** Opens (and on first use creates) the store; a connection that opens after a failure is closed. */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let failed = false
    const fail = (error: Error): void => {
      failed = true
      reject(error)
    }
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => {
      const database = request.result
      if (failed) {
        database.close()
        return
      }
      // Never block a newer version of the extension from upgrading the store.
      database.onversionchange = () => database.close()
      resolve(database)
    }
    request.onerror = () =>
      fail(request.error ?? new Error('Unable to open local background storage.'))
    request.onblocked = () =>
      fail(new Error('Background storage is busy. Close other extension tabs and try again.'))
  })
}

/** Resolves when the transaction commits; rejects with its error when it fails or aborts. */
function committed(transaction: IDBTransaction, fallback: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const listening = new AbortController()
    const options = { once: true, signal: listening.signal }
    const fail = (): void => {
      listening.abort()
      reject(transaction.error ?? new Error(fallback))
    }
    transaction.addEventListener(
      'complete',
      () => {
        listening.abort()
        resolve()
      },
      options,
    )
    transaction.addEventListener('error', fail, options)
    transaction.addEventListener('abort', fail, options)
  })
}

/** Native Blob storage. Never serialize media through chrome.storage or data URLs. */
export async function readWallpaper(): Promise<WallpaperSnapshot> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(STORE, 'readonly')
    const store = transaction.objectStore(STORE)
    const settings = store.get('settings')
    const media = store.get('media')
    await committed(transaction, 'Unable to read the saved background.')
    const value: unknown = media.result
    return {
      settings: parseWallpaper(settings.result),
      blob: value instanceof Blob ? value : null,
    }
  } finally {
    database.close()
  }
}

async function mutate(operation: (store: IDBObjectStore) => void): Promise<void> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(STORE, 'readwrite')
    try {
      operation(transaction.objectStore(STORE))
    } catch (error) {
      transaction.abort()
      throw error instanceof Error ? error : new Error('Unable to save the background.')
    }
    await committed(transaction, 'Unable to save the background. Check available disk space.')
  } finally {
    database.close()
  }
}

export async function saveWallpaperMedia(blob: Blob, settings: WallpaperSettings): Promise<void> {
  // Both keys commit together: a failed write leaves the previous media and settings intact.
  await mutate((store) => {
    store.put(blob, 'media')
    store.put(settings, 'settings')
  })
}

export async function saveWallpaperAdjustment(patch: Partial<WallpaperAdjustment>): Promise<void> {
  await mutate((store) => {
    const request = store.get('settings')
    request.onsuccess = () => {
      store.put(parseWallpaper({ ...parseWallpaper(request.result), ...patch }), 'settings')
    }
  })
}

export async function resetWallpaper(): Promise<void> {
  await mutate((store) => {
    store.delete('media')
    store.put(defaultWallpaper, 'settings')
  })
}

/** Switching to a built-in background releases any stored photo or video. */
export async function saveWallpaperPreset(preset: WallpaperPreset): Promise<void> {
  await mutate((store) => {
    store.delete('media')
    store.put({ ...defaultWallpaper, preset }, 'settings')
  })
}
