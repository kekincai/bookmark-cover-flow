import type { Bookmark } from '../domain/bookmark'
import type { CoverArt, CoverItem } from '../domain/cover'
import { isPreviewableUrl } from '../shared/preview-message'
import { createCoverArt } from './cover-art'

/** Bounded memo: the same site and title always produce the same art. */
const artCache = new Map<string, CoverArt>()
const ART_CACHE_LIMIT = 20_000

function coverArt(title: string, hostname: string, color: string | undefined): CoverArt {
  const key = `${title}\u0000${hostname}\u0000${color ?? ''}`
  let art = artCache.get(key)
  if (art === undefined) {
    if (artCache.size >= ART_CACHE_LIMIT) artCache.clear()
    art = createCoverArt(title, hostname, color)
    artCache.set(key, art)
  }
  return art
}

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

export interface FiledBookmark extends Bookmark {
  readonly folderTitle: string
}

export interface ResolveCoverOptions {
  /** When false the cover is generated immediately and no preview is ever requested. */
  readonly preferPreview: boolean
  /** Site colors already learned this session, keyed by hostname. */
  readonly siteColors?: ReadonlyMap<string, string>
}

export function resolveCover(bookmark: FiledBookmark, options: ResolveCoverOptions): CoverItem {
  const parsedUrl = safeUrl(bookmark.url)
  const subtitle = parsedUrl?.hostname.replace(/^www\./, '') ?? bookmark.url
  const title = bookmark.title.trim() || subtitle
  const favicon = faviconUrl(bookmark.url)
  const canPreview =
    options.preferPreview && favicon !== undefined && isPreviewableUrl(bookmark.url)
  const color = options.siteColors?.get(subtitle)

  return {
    bookmarkId: bookmark.id,
    title,
    subtitle,
    url: bookmark.url,
    folderTitle: bookmark.folderTitle,
    ...(bookmark.dateAdded === undefined ? {} : { dateAdded: bookmark.dateAdded }),
    ...(favicon === undefined ? {} : { favicon }),
    imageKind: canPreview ? 'pending' : 'generated',
    // Built on first read: a collection switch resolves every bookmark, but only the covers that
    // are actually rendered ever need their art.
    get art(): CoverArt {
      return coverArt(title, subtitle, color)
    },
  }
}

export const resolveCovers = (
  bookmarks: readonly FiledBookmark[],
  options: ResolveCoverOptions,
): readonly CoverItem[] => bookmarks.map((bookmark) => resolveCover(bookmark, options))

/** Re-derive the generated art from a site color without touching the preview state. */
export function applySiteColor(item: CoverItem, color: string): CoverItem {
  if (item.art.background === color) return item
  return { ...item, art: coverArt(item.title, item.subtitle, color) }
}
