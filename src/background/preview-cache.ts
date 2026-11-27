import {
  isPreviewableUrl,
  PREVIEW_CACHE_PREFIX,
  type PreviewPriority,
  type PreviewResponse,
} from '../shared/preview-message'
import { extractPreviewImage, extractThemeColor } from './preview-metadata'

interface CachedPreview {
  /** The page URL the entry was resolved for; a hash collision on the key reads as a miss. */
  readonly url: string
  readonly imageUrl?: string
  readonly themeColor?: string
  readonly resolvedAt: number
}

const SUCCESS_MAX_AGE = 7 * 24 * 60 * 60 * 1000
const FAILURE_MAX_AGE = 12 * 60 * 60 * 1000
const FETCH_TIMEOUT_MS = 8_000
/** Preview metadata lives in <head>; reading stops there or after this many characters. */
const MAX_HTML_LENGTH = 512_000
/** Signed CDN image URLs can be long; anything beyond this is not worth a storage slot. */
const MAX_IMAGE_URL_LENGTH = 2_048
/** Hard cap on cached pages; the sweep drops the oldest beyond it. */
const MAX_ENTRIES = 3_000

function cacheKey(url: string): string {
  let hash = 2166136261
  for (const character of url) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return `${PREVIEW_CACHE_PREFIX}${(hash >>> 0).toString(16)}`
}

function parseCache(value: unknown): CachedPreview | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const record = value as Record<string, unknown>
  if (typeof record.resolvedAt !== 'number' || typeof record.url !== 'string') return undefined
  if (record.imageUrl !== undefined && typeof record.imageUrl !== 'string') return undefined
  return {
    url: record.url,
    resolvedAt: record.resolvedAt,
    ...(typeof record.imageUrl === 'string' ? { imageUrl: record.imageUrl } : {}),
    ...(typeof record.themeColor === 'string' ? { themeColor: record.themeColor } : {}),
  }
}

async function readCache(url: string): Promise<CachedPreview | undefined> {
  const key = cacheKey(url)
  const stored = await chrome.storage.local.get(key)
  const entry = parseCache(stored[key])
  return entry?.url === url ? entry : undefined
}

async function writeCache(
  url: string,
  imageUrl: string | undefined,
  themeColor?: string,
): Promise<void> {
  const value: CachedPreview = {
    url,
    resolvedAt: Date.now(),
    ...(imageUrl === undefined || imageUrl.length > MAX_IMAGE_URL_LENGTH ? {} : { imageUrl }),
    ...(themeColor === undefined ? {} : { themeColor }),
  }
  await chrome.storage.local.set({ [cacheKey(url)]: value })
}

function isFresh(value: CachedPreview, now = Date.now()): boolean {
  const maximumAge = value.imageUrl === undefined ? FAILURE_MAX_AGE : SUCCESS_MAX_AGE
  return now - value.resolvedAt < maximumAge
}

/**
 * Delete expired, malformed and surplus entries so the cache honours its expiry promise and never
 * crowds preferences and history out of the storage.local quota.
 */
export async function sweepPreviewCache(): Promise<void> {
  const all = await chrome.storage.local.get(null)
  const now = Date.now()
  const stale: string[] = []
  const live: (readonly [string, number])[] = []
  for (const [key, value] of Object.entries(all)) {
    if (!key.startsWith(PREVIEW_CACHE_PREFIX)) continue
    const entry = parseCache(value)
    if (entry === undefined || !isFresh(entry, now)) stale.push(key)
    else live.push([key, entry.resolvedAt])
  }
  if (live.length > MAX_ENTRIES) {
    const oldestFirst = live.toSorted(([, left], [, right]) => left - right)
    stale.push(...oldestFirst.slice(0, live.length - MAX_ENTRIES).map(([key]) => key))
  }
  if (stale.length > 0) await chrome.storage.local.remove(stale)
}

/** Read the document only up to the end of <head>, so a large page is never downloaded whole. */
async function readHead(response: Response): Promise<string> {
  if (response.body === null) return ''
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let html = ''
  try {
    while (html.length < MAX_HTML_LENGTH) {
      const { done, value } = await reader.read()
      if (done) break
      html += decoder.decode(value, { stream: true })
      if (/<\/head\s*>|<body[\s>]/i.test(html)) break
    }
  } finally {
    await reader.cancel().catch(() => undefined)
  }
  return html.slice(0, MAX_HTML_LENGTH)
}

const isTimeout = (error: unknown): boolean =>
  error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')

export async function resolvePreview(
  url: string,
  priority: PreviewPriority = 'low',
): Promise<PreviewResponse> {
  // The UI filters too, but the worker is the boundary that actually touches the network.
  if (!isPreviewableUrl(url)) return { source: 'none' }

  const cached = await readCache(url)
  if (cached !== undefined && isFresh(cached)) {
    return {
      ...(cached.imageUrl === undefined ? {} : { imageUrl: cached.imageUrl }),
      ...(cached.themeColor === undefined ? {} : { themeColor: cached.themeColor }),
      source: cached.imageUrl === undefined ? 'none' : 'cache',
    }
  }

  try {
    const response = await fetch(url, {
      credentials: 'omit',
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      priority,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    const finalUrl = response.url || url
    const contentType = response.headers.get('content-type') ?? ''
    // A public page that redirects into a private network is dropped before its body is read.
    if (
      !response.ok ||
      !isPreviewableUrl(finalUrl) ||
      !contentType.toLowerCase().includes('text/html')
    ) {
      await response.body?.cancel().catch(() => undefined)
      await writeCache(url, undefined)
      return { source: 'none' }
    }
    const html = await readHead(response)
    const imageUrl = extractPreviewImage(html, finalUrl)
    const themeColor = extractThemeColor(html)
    await writeCache(url, imageUrl, themeColor)
    return {
      ...(imageUrl === undefined ? {} : { imageUrl }),
      ...(themeColor === undefined ? {} : { themeColor }),
      source: imageUrl === undefined ? 'none' : 'network',
    }
  } catch (error: unknown) {
    if (!isTimeout(error)) console.warn('Unable to resolve bookmark preview.', error)
    await writeCache(url, undefined)
    return { source: 'none' }
  }
}
