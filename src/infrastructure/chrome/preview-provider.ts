import type { PreviewProvider, PreviewResult } from '../../application/preview-bookmarks'
import {
  isPreviewResponse,
  type PreviewRequest,
  type PreviewResponse,
} from '../../shared/preview-message'

export function createPreviewProvider(): PreviewProvider {
  return {
    async resolve(url: string): Promise<PreviewResult> {
      if (typeof chrome === 'undefined' || chrome.runtime?.id === undefined) return {}
      try {
        const request: PreviewRequest = { type: 'resolve-preview', url }
        const response: unknown = await chrome.runtime.sendMessage<PreviewRequest, PreviewResponse>(
          request,
        )
        if (!isPreviewResponse(response)) return {}
        return {
          ...(response.imageUrl === undefined ? {} : { imageUrl: response.imageUrl }),
          ...(response.themeColor === undefined ? {} : { themeColor: response.themeColor }),
        }
      } catch (error: unknown) {
        console.warn('Unable to request bookmark preview.', error)
        return {}
      }
    },
  }
}
