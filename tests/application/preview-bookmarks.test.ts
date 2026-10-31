import { describe, expect, it, vi } from 'vitest'
import { applyPreview, preloadBookmarkPreviews } from '../../src/application/preview-bookmarks'
import { coverItem } from '../support/cover-item'

const item = coverItem({ bookmarkId: '1', imageKind: 'pending' })

describe('preloadBookmarkPreviews', () => {
  it('publishes resolved preview results', async () => {
    const onPreview = vi.fn()
    const result = { imageUrl: 'https://example.com/cover.jpg', themeColor: '#3178C6' }
    await preloadBookmarkPreviews(
      [item],
      { resolve: vi.fn().mockResolvedValue(result) },
      onPreview,
      () => true,
    )
    expect(onPreview).toHaveBeenCalledWith('1', result)
  })

  it('does not publish stale results', async () => {
    const onPreview = vi.fn()
    await preloadBookmarkPreviews(
      [item],
      { resolve: vi.fn().mockResolvedValue({ imageUrl: 'https://example.com/cover.jpg' }) },
      onPreview,
      () => false,
    )
    expect(onPreview).not.toHaveBeenCalled()
  })
})

describe('applyPreview', () => {
  it('shows the preview image and recolors the generated art from the theme color', () => {
    const next = applyPreview(item, {
      imageUrl: 'https://example.com/a.png',
      themeColor: '#3178C6',
    })
    expect(next.imageKind).toBe('preview')
    expect(next.image).toBe('https://example.com/a.png')
    expect(next.art.background).toBe('#3178C6')
  })

  it('settles on the generated cover when a site has no preview', () => {
    expect(applyPreview(item, {})).toMatchObject({ imageKind: 'generated', art: item.art })
  })
})
