import type { CoverItem } from '../domain/cover'
import { applySiteColor } from './resolve-cover'

export interface PreviewResult {
  readonly imageUrl?: string
  readonly themeColor?: string
}

export interface PreviewProvider {
  resolve(url: string): Promise<PreviewResult>
}

/** A missing preview settles the cover on its generated art instead of leaving it pending. */
export function applyPreview(item: CoverItem, result: PreviewResult): CoverItem {
  const colored = result.themeColor === undefined ? item : applySiteColor(item, result.themeColor)
  return result.imageUrl === undefined
    ? { ...colored, imageKind: 'generated' }
    : { ...colored, image: result.imageUrl, imageKind: 'preview' }
}

export async function preloadBookmarkPreviews(
  items: readonly CoverItem[],
  provider: PreviewProvider,
  onPreview: (bookmarkId: string, result: PreviewResult) => void,
  isCurrent: () => boolean,
  concurrency = 4,
): Promise<void> {
  let nextIndex = 0
  const worker = async (): Promise<void> => {
    while (nextIndex < items.length && isCurrent()) {
      const index = nextIndex
      nextIndex += 1
      const item = items[index]
      if (item === undefined) continue
      const result = await provider.resolve(item.url)
      if (isCurrent()) onPreview(item.bookmarkId, result)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => worker()),
  )
}
