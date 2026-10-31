import { describe, expect, it } from 'vitest'
import { extractPreviewImage, extractThemeColor } from '../../src/background/preview-metadata'

describe('extractPreviewImage', () => {
  it('extracts and resolves an Open Graph image regardless of attribute order', () => {
    const html = '<meta content="/cover.jpg?x=1&amp;y=2" property="og:image">'
    expect(extractPreviewImage(html, 'https://example.com/article')).toBe(
      'https://example.com/cover.jpg?x=1&y=2',
    )
  })

  it('falls back to Twitter image metadata', () => {
    const html = '<meta name="twitter:image" content="https://cdn.example.com/card.png">'
    expect(extractPreviewImage(html, 'https://example.com')).toBe(
      'https://cdn.example.com/card.png',
    )
  })

  it('rejects non-http image URLs', () => {
    const html = '<meta property="og:image" content="data:image/png;base64,abc">'
    expect(extractPreviewImage(html, 'https://example.com')).toBeUndefined()
  })
})

describe('extractThemeColor', () => {
  it('prefers the light or unconditional theme color', () => {
    const html =
      '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#111">' +
      '<meta name="theme-color" content="#3178c6">'
    expect(extractThemeColor(html)).toBe('#3178C6')
  })

  it('falls back to a dark-only color and ignores invalid values', () => {
    expect(
      extractThemeColor(
        '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#111">',
      ),
    ).toBe('#111111')
    expect(extractThemeColor('<meta name="theme-color" content="var(--x)">')).toBeUndefined()
  })
})
