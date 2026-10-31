import { describe, expect, it } from 'vitest'
import { resolveCover } from '../../src/application/resolve-cover'

const options = { preferPreview: true }

describe('resolveCover', () => {
  it('generates a cover immediately when Chrome favicon and preview APIs are unavailable', () => {
    const cover = resolveCover(
      { id: '1', title: '', url: 'https://www.example.com/path', folderTitle: 'Reading' },
      options,
    )
    expect(cover.title).toBe('example.com')
    expect(cover.subtitle).toBe('example.com')
    expect(cover.folderTitle).toBe('Reading')
    expect(cover.imageKind).toBe('generated')
    expect(cover.image).toBeUndefined()
  })

  it('uses a known site color for the generated art', () => {
    const cover = resolveCover(
      { id: '1', title: 'TypeScript', url: 'https://typescriptlang.org', folderTitle: '' },
      { preferPreview: false, siteColors: new Map([['typescriptlang.org', '#3178C6']]) },
    )
    expect(cover.art.background).toBe('#3178C6')
    expect(cover.art.glyph).toBe('TS')
  })

  it('does not throw for malformed URLs', () => {
    expect(
      resolveCover({ id: '2', title: 'Local note', url: 'not-a-url', folderTitle: '' }, options)
        .subtitle,
    ).toBe('not-a-url')
  })
})
