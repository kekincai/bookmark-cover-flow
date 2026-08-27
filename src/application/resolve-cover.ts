import type { Bookmark } from '../domain/bookmark'
import type { CoverItem } from '../domain/cover'

const accents = ['#5a7ff5', '#5f8f7a', '#8b75ab', '#b68058', '#677d9a', '#9a6f77'] as const

function safeUrl(value: string): URL | undefined {
  try {
    return new URL(value)
  } catch {
    return undefined
  }
}

function faviconUrl(url: string): string | undefined {
  if (typeof chrome === 'undefined' || chrome.runtime?.id === undefined) return undefined
  return chrome.runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(url)}&size=64`)
}

export function resolveCover(bookmark: Bookmark, index = 0): CoverItem {
  const parsedUrl = safeUrl(bookmark.url)
  const subtitle = parsedUrl?.hostname.replace(/^www\./, '') ?? bookmark.url
  const image = faviconUrl(bookmark.url)

  return {
    bookmarkId: bookmark.id,
    title: bookmark.title.trim() || subtitle,
    subtitle,
    url: bookmark.url,
    ...(image === undefined ? {} : { image, favicon: image }),
    imageKind: image === undefined ? 'generated' : 'favicon',
    fallbackKind: image === undefined ? 'generated' : 'favicon',
    accent: accents[index % accents.length] ?? accents[0],
  }
}

export const resolveCovers = (bookmarks: readonly Bookmark[]): readonly CoverItem[] =>
  bookmarks.map(resolveCover)
