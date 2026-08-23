export interface PreviewRequest {
  readonly type: 'resolve-preview'
  readonly url: string
}

export interface PreviewResponse {
  readonly imageUrl?: string
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
  return (
    !('imageUrl' in value) || value.imageUrl === undefined || typeof value.imageUrl === 'string'
  )
}
