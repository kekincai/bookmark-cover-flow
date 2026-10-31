import type { Bookmark } from '../domain/bookmark'
import type { CoverItem } from '../domain/cover'
import { createCoverArt } from './cover-art'

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
  const canPreview = options.preferPreview && parsedUrl !== undefined && favicon !== undefined

  return {
    bookmarkId: bookmark.id,
    title,
    subtitle,
    url: bookmark.url,
    folderTitle: bookmark.folderTitle,
    ...(bookmark.dateAdded === undefined ? {} : { dateAdded: bookmark.dateAdded }),
    ...(favicon === undefined ? {} : { favicon }),
    imageKind: canPreview ? 'pending' : 'generated',
    art: createCoverArt(title, subtitle, options.siteColors?.get(subtitle)),
  }
}

export const resolveCovers = (
  bookmarks: readonly FiledBookmark[],
  options: ResolveCoverOptions,
): readonly CoverItem[] => bookmarks.map((bookmark) => resolveCover(bookmark, options))

/** Re-derive the generated art from a site color without touching the preview state. */
export function applySiteColor(item: CoverItem, color: string): CoverItem {
  if (item.art.background === color) return item
  return { ...item, art: createCoverArt(item.title, item.subtitle, color) }
}
