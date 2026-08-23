import { describe, expect, it, vi } from 'vitest'
import { preloadBookmarkPreviews } from '../../src/application/preview-bookmarks'
import type { CoverItem } from '../../src/domain/cover'

const item: CoverItem = {
  bookmarkId: '1',
  title: 'Example',
  subtitle: 'example.com',
  url: 'https://example.com',
  imageKind: 'generated',
  fallbackKind: 'generated',
  accent: '#000',
}

describe('preloadBookmarkPreviews', () => {
  it('publishes resolved preview images', async () => {
    const onPreview = vi.fn()
    await preloadBookmarkPreviews(
      [item],
      { resolve: vi.fn().mockResolvedValue('https://example.com/cover.jpg') },
      onPreview,
      () => true,
    )
    expect(onPreview).toHaveBeenCalledWith('1', 'https://example.com/cover.jpg')
  })

  it('does not publish stale results', async () => {
    const onPreview = vi.fn()
    await preloadBookmarkPreviews(
      [item],
      { resolve: vi.fn().mockResolvedValue('https://example.com/cover.jpg') },
      onPreview,
      () => false,
    )
    expect(onPreview).not.toHaveBeenCalled()
  })
})
