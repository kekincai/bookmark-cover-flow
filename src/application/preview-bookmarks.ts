import type { CoverItem } from '../domain/cover'

export interface PreviewProvider {
  resolve(url: string): Promise<string | undefined>
}

export function applyPreviewImage(item: CoverItem, imageUrl: string): CoverItem {
  return { ...item, image: imageUrl, imageKind: 'preview' }
}

export async function preloadBookmarkPreviews(
  items: readonly CoverItem[],
  provider: PreviewProvider,
  onPreview: (bookmarkId: string, imageUrl: string) => void,
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
      const imageUrl = await provider.resolve(item.url)
      if (imageUrl !== undefined && isCurrent()) onPreview(item.bookmarkId, imageUrl)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => worker()),
  )
}
