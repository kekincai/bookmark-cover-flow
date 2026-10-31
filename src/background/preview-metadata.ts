import { parseColor } from '../application/cover-art'

const PREVIEW_NAMES = new Set(['og:image', 'og:image:url', 'twitter:image', 'twitter:image:src'])

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
}

function parseAttributes(tag: string): ReadonlyMap<string, string> {
  const attributes = new Map<string, string>()
  const pattern = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g
  for (const match of tag.matchAll(pattern)) {
    const name = match[1]?.toLocaleLowerCase()
    const value = match[2] ?? match[3] ?? match[4]
    if (name !== undefined && value !== undefined) attributes.set(name, decodeHtmlEntities(value))
  }
  return attributes
}

function resolveHttpImage(value: string, pageUrl: string): string | undefined {
  try {
    const url = new URL(value, pageUrl)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined
  } catch {
    return undefined
  }
}

export function extractPreviewImage(html: string, pageUrl: string): string | undefined {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = parseAttributes(match[0])
    const name = (attributes.get('property') ?? attributes.get('name'))?.toLocaleLowerCase()
    const content = attributes.get('content')
    if (name !== undefined && PREVIEW_NAMES.has(name) && content !== undefined) {
      const image = resolveHttpImage(content, pageUrl)
      if (image !== undefined) return image
    }
  }

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const attributes = parseAttributes(match[0])
    if (attributes.get('rel')?.toLocaleLowerCase() !== 'image_src') continue
    const href = attributes.get('href')
    if (href !== undefined) return resolveHttpImage(href, pageUrl)
  }

  return undefined
}

/** Prefer a theme color that applies to light mode or to every scheme. */
export function extractThemeColor(html: string): string | undefined {
  let fallback: string | undefined
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = parseAttributes(match[0])
    if (attributes.get('name')?.toLocaleLowerCase() !== 'theme-color') continue
    const color = parseColor(attributes.get('content') ?? '')
    if (color === undefined) continue
    const media = attributes.get('media')?.toLocaleLowerCase() ?? ''
    if (!media.includes('dark')) return color
    fallback ??= color
  }
  return fallback
}
