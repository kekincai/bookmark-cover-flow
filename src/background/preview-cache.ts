import type { PreviewResponse } from '../shared/preview-message'
import { extractPreviewImage } from './preview-metadata'

interface CachedPreview {
  readonly imageUrl?: string
  readonly resolvedAt: number
}

const SUCCESS_MAX_AGE = 7 * 24 * 60 * 60 * 1000
const FAILURE_MAX_AGE = 12 * 60 * 60 * 1000
const MAX_HTML_LENGTH = 2_000_000

function cacheKey(url: string): string {
  let hash = 2166136261
  for (const character of url) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return `preview-${(hash >>> 0).toString(16)}`
}

function parseCache(value: unknown): CachedPreview | undefined {
  if (typeof value !== 'object' || value === null || !('resolvedAt' in value)) return undefined
  if (typeof value.resolvedAt !== 'number') return undefined
  if ('imageUrl' in value && value.imageUrl !== undefined && typeof value.imageUrl !== 'string') {
    return undefined
  }
  return {
    resolvedAt: value.resolvedAt,
    ...('imageUrl' in value && typeof value.imageUrl === 'string'
      ? { imageUrl: value.imageUrl }
      : {}),
  }
}

async function readCache(url: string): Promise<CachedPreview | undefined> {
  const key = cacheKey(url)
  const stored = await chrome.storage.local.get(key)
  return parseCache(stored[key])
}

async function writeCache(url: string, imageUrl: string | undefined): Promise<void> {
  const value: CachedPreview = {
    resolvedAt: Date.now(),
    ...(imageUrl === undefined ? {} : { imageUrl }),
  }
  await chrome.storage.local.set({ [cacheKey(url)]: value })
}

function isFresh(value: CachedPreview): boolean {
  const maximumAge = value.imageUrl === undefined ? FAILURE_MAX_AGE : SUCCESS_MAX_AGE
  return Date.now() - value.resolvedAt < maximumAge
}

export async function resolvePreview(url: string): Promise<PreviewResponse> {
  const cached = await readCache(url)
  if (cached !== undefined && isFresh(cached)) {
    return {
      ...(cached.imageUrl === undefined ? {} : { imageUrl: cached.imageUrl }),
      source: cached.imageUrl === undefined ? 'none' : 'cache',
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8_000)
  try {
    const response = await fetch(url, {
      credentials: 'omit',
      redirect: 'follow',
      signal: controller.signal,
    })
    const contentType = response.headers.get('content-type') ?? ''
    if (!response.ok || !contentType.toLocaleLowerCase().includes('text/html')) {
      await writeCache(url, undefined)
      return { source: 'none' }
    }
    const html = (await response.text()).slice(0, MAX_HTML_LENGTH)
    const imageUrl = extractPreviewImage(html, response.url || url)
    await writeCache(url, imageUrl)
    return {
      ...(imageUrl === undefined ? {} : { imageUrl }),
      source: imageUrl === undefined ? 'none' : 'network',
    }
  } catch (error: unknown) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      console.warn('Unable to resolve bookmark preview.', error)
    }
    await writeCache(url, undefined)
    return { source: 'none' }
  } finally {
    clearTimeout(timeout)
  }
}
