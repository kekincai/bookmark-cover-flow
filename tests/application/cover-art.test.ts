import { describe, expect, it } from 'vitest'
import {
  COVER_TEMPLATES,
  contrastRatio,
  coverGlyph,
  createCoverArt,
  deriveAccent,
  hashString,
  parseColor,
  pickCoverTemplate,
  pickForeground,
  splitWordmark,
} from '../../src/application/cover-art'

describe('cover template selection', () => {
  it('always gives the same domain the same template', () => {
    for (const host of ['github.com', 'figma.com', 'sspai.com', 'zh.wikipedia.org']) {
      expect(pickCoverTemplate(host)).toBe(pickCoverTemplate(host))
      expect(pickCoverTemplate(host)).toBe(COVER_TEMPLATES[hashString(host) % 4])
    }
  })

  it('uses all four templates across a realistic set of domains', () => {
    const hosts = Array.from({ length: 40 }, (_, index) => `site-${index}.example`)
    expect(new Set(hosts.map(pickCoverTemplate))).toEqual(new Set(COVER_TEMPLATES))
  })
})

describe('cover colors', () => {
  it('parses theme-color values and rejects anything else', () => {
    expect(parseColor('#abc')).toBe('#AABBCC')
    expect(parseColor(' #3178c6 ')).toBe('#3178C6')
    expect(parseColor('rgb(255, 102, 0)')).toBe('#FF6600')
    expect(parseColor('rgb(300 0 0)')).toBeUndefined()
    expect(parseColor('url(javascript:alert(1))')).toBeUndefined()
  })

  it('chooses black or white text by contrast', () => {
    expect(pickForeground('#3178C6')).toBe('#FFFFFF')
    expect(pickForeground('#F2EFE8')).toBe('#1D1D1F')
    for (const background of ['#101014', '#FF6600', '#F5F5F7', '#5200FF', '#2DA44E']) {
      expect(contrastRatio(background, pickForeground(background))).toBeGreaterThanOrEqual(3)
    }
  })

  it('uses the complement for circle and a related tint for other templates', () => {
    const circle = deriveAccent('#0B3D91', 'circle')
    const band = deriveAccent('#0B3D91', 'bands')
    expect(circle).not.toBe(band)
    expect(contrastRatio(circle, '#0B3D91')).toBeGreaterThan(2)
    expect(contrastRatio(band, '#0B3D91')).toBeGreaterThan(4.5)
  })

  it('prefers the site color and falls back to a deterministic base', () => {
    expect(createCoverArt('TypeScript', 'typescriptlang.org', '#3178C6').background).toBe('#3178C6')
    expect(createCoverArt('Example', 'example.com').background).toBe(
      createCoverArt('Other title', 'example.com').background,
    )
    expect(createCoverArt('Example', 'example.com', 'not-a-color').background).toMatch(
      /^#[\dA-F]{6}$/,
    )
  })
})

describe('cover lettering', () => {
  it('uses two capitals for mixed-case Latin names and one glyph otherwise', () => {
    expect(coverGlyph('TypeScript')).toBe('TS')
    expect(coverGlyph('GitHub')).toBe('GH')
    expect(coverGlyph('MDN Web Docs')).toBe('M')
    expect(coverGlyph('figma')).toBe('F')
    expect(coverGlyph('少数派')).toBe('少')
    expect(coverGlyph('  — Notes')).toBe('N')
  })

  it('splits word marks at spaces, case boundaries or the middle of CJK names', () => {
    expect(splitWordmark('Apple Developer', 'developer.apple.com')).toEqual(['Apple', 'Developer'])
    expect(splitWordmark('GitHub', 'github.com')).toEqual(['Git', 'Hub'])
    expect(splitWordmark('少数派', 'sspai.com')).toEqual(['少数', '派'])
    expect(splitWordmark('Figma', 'figma.com')).toEqual(['Figma', '.com'])
  })
})
