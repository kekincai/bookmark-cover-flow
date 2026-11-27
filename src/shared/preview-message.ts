/** chrome.storage.local keys written by the background preview cache. */
export const PREVIEW_CACHE_PREFIX = 'preview-'

/**
 * Optional host access requested when the user turns on webpage previews. It is never granted at
 * install, so the extension reads no website until the user opts in from Settings.
 */
export const PREVIEW_ORIGINS: readonly string[] = ['https://*/*', 'http://*/*']

/** Longest page URL the preview pipeline accepts; longer bookmarks keep their generated cover. */
const MAX_PREVIEW_URL_LENGTH = 2_048

export type PreviewPriority = 'high' | 'low'

export interface PreviewRequest {
  readonly type: 'resolve-preview'
  readonly url: string
  /** `high` for the selected cover, `low` for neighbours prefetched around it. */
  readonly priority?: PreviewPriority
}

export interface PreviewResponse {
  readonly imageUrl?: string
  readonly themeColor?: string
  readonly source: 'cache' | 'network' | 'none'
}

function isPrivateIPv4(hostname: string): boolean {
  const parts = hostname.split('.')
  if (parts.length !== 4 || !parts.every((part) => /^\d{1,3}$/.test(part))) return false
  const [a = 0, b = 0] = parts.map(Number)
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  )
}

function isPrivateIPv6(hostname: string): boolean {
  if (!hostname.startsWith('[')) return false
  const address = hostname.slice(1, -1).toLowerCase()
  return (
    address === '::' ||
    address === '::1' ||
    address.startsWith('::ffff:') ||
    /^f[cd]/.test(address) ||
    /^fe[89ab]/.test(address) ||
    // Multicast: never a web page.
    /^ff/.test(address)
  )
}

const LOCAL_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.home.arpa', '.intranet']

/**
 * Only public http(s) pages are fetched for previews. Loopback, private-network and single-label
 * intranet hosts are never contacted from the background, and nor are other schemes.
 */
export function isPreviewableUrl(value: string): boolean {
  if (value.length > MAX_PREVIEW_URL_LENGTH) return false
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
  if (url.username !== '' || url.password !== '') return false
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '')
  if (hostname === 'localhost' || LOCAL_SUFFIXES.some((suffix) => hostname.endsWith(suffix)))
    return false
  if (isPrivateIPv4(hostname) || isPrivateIPv6(hostname)) return false
  // A bracketed IPv6 literal that passed the private-address check is public. The single-label
  // test (no dot, e.g. `http://intranet/`) only applies to DNS names.
  return hostname.startsWith('[') || hostname.includes('.')
}

export function isPreviewRequest(value: unknown): value is PreviewRequest {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    record.type === 'resolve-preview' &&
    typeof record.url === 'string' &&
    (record.priority === undefined || record.priority === 'high' || record.priority === 'low')
  )
}

export function isPreviewResponse(value: unknown): value is PreviewResponse {
  if (typeof value !== 'object' || value === null || !('source' in value)) return false
  if (!['cache', 'network', 'none'].includes(String(value.source))) return false
  const optionalString = (key: 'imageUrl' | 'themeColor'): boolean =>
    !(key in value) ||
    (value as Record<string, unknown>)[key] === undefined ||
    typeof (value as Record<string, unknown>)[key] === 'string'
  return optionalString('imageUrl') && optionalString('themeColor')
}
