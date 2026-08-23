import type { Bookmark } from '../../domain/bookmark'
import type { RecentBookmark } from '../../domain/recent-bookmark'

const key = 'bookmark-cover-flow-recent'
const maximumEntries = 50

function parseRecentBookmarks(value: unknown): readonly RecentBookmark[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry): RecentBookmark[] => {
    const candidate: unknown = entry
    if (typeof candidate !== 'object' || candidate === null) return []
    if (!('id' in candidate) || typeof candidate.id !== 'string') return []
    if (!('title' in candidate) || typeof candidate.title !== 'string') return []
    if (!('url' in candidate) || typeof candidate.url !== 'string') return []
    if (
      !('openedAt' in candidate) ||
      typeof candidate.openedAt !== 'number' ||
      !Number.isFinite(candidate.openedAt)
    )
      return []
    return [
      {
        id: candidate.id,
        title: candidate.title,
        url: candidate.url,
        openedAt: candidate.openedAt,
      },
    ]
  })
}

async function readValue(): Promise<unknown> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local !== undefined) {
    const result = await chrome.storage.local.get(key)
    return result[key]
  }
  const value = localStorage.getItem(key)
  return value === null ? undefined : (JSON.parse(value) as unknown)
}

async function writeValue(value: readonly RecentBookmark[]): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local !== undefined) {
    await chrome.storage.local.set({ [key]: value })
    return
  }
  localStorage.setItem(key, JSON.stringify(value))
}

export async function loadRecentBookmarks(): Promise<readonly RecentBookmark[]> {
  try {
    return [...parseRecentBookmarks(await readValue())].sort(
      (left, right) => right.openedAt - left.openedAt,
    )
  } catch (error: unknown) {
    console.warn('Unable to read recent bookmarks.', error)
    return []
  }
}

export async function recordRecentBookmark(
  bookmark: Bookmark,
  openedAt = Date.now(),
): Promise<readonly RecentBookmark[]> {
  const current = await loadRecentBookmarks()
  const next: RecentBookmark[] = [
    { id: bookmark.id, title: bookmark.title, url: bookmark.url, openedAt },
    ...current.filter((entry) => entry.id !== bookmark.id && entry.url !== bookmark.url),
  ].slice(0, maximumEntries)
  await writeValue(next)
  return next
}
