import {
  defaultWallpaper,
  parseWallpaper,
  type WallpaperAdjustment,
  type WallpaperSettings,
} from '../domain/wallpaper'

const DATABASE = 'bookmark-cover-flow-wallpaper'
const STORE = 'wallpaper'
export interface WallpaperSnapshot {
  readonly settings: WallpaperSettings
  readonly blob: Blob | null
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error('Unable to open local background storage.'))
    request.onblocked = () =>
      reject(new Error('Background storage is busy. Close other extension tabs and try again.'))
  })
}

/** Native Blob storage. Never serialize media through chrome.storage or data URLs. */
export async function readWallpaper(): Promise<WallpaperSnapshot> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readonly')
    const store = transaction.objectStore(STORE)
    const settings = store.get('settings')
    const media = store.get('media')
    transaction.oncomplete = () => {
      database.close()
      const value: unknown = media.result
      resolve({
        settings: parseWallpaper(settings.result),
        blob: value instanceof Blob ? value : null,
      })
    }
    transaction.onabort = transaction.onerror = () => {
      database.close()
      reject(transaction.error ?? new Error('Unable to read the saved background.'))
    }
  })
}

async function mutate(operation: (store: IDBObjectStore) => void): Promise<void> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite')
    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
    transaction.onabort = transaction.onerror = () => {
      database.close()
      reject(
        transaction.error ??
          new Error('Unable to save the background. Check available disk space.'),
      )
    }
    try {
      operation(transaction.objectStore(STORE))
    } catch (error) {
      transaction.abort()
      reject(error instanceof Error ? error : new Error('Unable to save the background.'))
    }
  })
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
