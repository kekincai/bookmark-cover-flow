import { PREVIEW_CACHE_PREFIX } from '../../shared/preview-message'

export interface PreviewCacheService {
  /** False outside the extension, where there is no preview cache to manage. */
  readonly available: boolean
  /** Number of cached preview images (failed lookups are cached too but not counted). */
  count(): Promise<number>
  clear(): Promise<void>
}

async function previewEntries(): Promise<readonly [string, unknown][]> {
  const all = await chrome.storage.local.get(null)
  return Object.entries(all).filter(([key]) => key.startsWith(PREVIEW_CACHE_PREFIX))
}

export function createPreviewCacheService(): PreviewCacheService {
  const available =
    typeof chrome !== 'undefined' &&
    chrome.runtime?.id !== undefined &&
    chrome.storage?.local !== undefined
  return {
    available,
    async count(): Promise<number> {
      if (!available) return 0
      return (await previewEntries()).filter(
        ([, value]) =>
          typeof value === 'object' &&
          value !== null &&
          typeof (value as Record<string, unknown>).imageUrl === 'string',
      ).length
    },
    async clear(): Promise<void> {
      if (!available) return
      await chrome.storage.local.remove((await previewEntries()).map(([key]) => key))
    },
  }
}
