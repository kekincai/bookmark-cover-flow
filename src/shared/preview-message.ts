/** chrome.storage.local keys written by the background preview cache. */
export const PREVIEW_CACHE_PREFIX = 'preview-'

export interface PreviewRequest {
  readonly type: 'resolve-preview'
  readonly url: string
}

export interface PreviewResponse {
  readonly imageUrl?: string
  readonly themeColor?: string
  readonly source: 'cache' | 'network' | 'none'
}

export function isPreviewRequest(value: unknown): value is PreviewRequest {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'resolve-preview' &&
    'url' in value &&
    typeof value.url === 'string'
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
