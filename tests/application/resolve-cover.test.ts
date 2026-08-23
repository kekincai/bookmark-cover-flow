import { describe, expect, it } from 'vitest'
import { resolveCover } from '../../src/application/resolve-cover'

describe('resolveCover', () => {
  it('derives a quiet generated cover when Chrome favicon APIs are unavailable', () => {
    const cover = resolveCover({ id: '1', title: '', url: 'https://www.example.com/path' })
    expect(cover.title).toBe('example.com')
    expect(cover.subtitle).toBe('example.com')
    expect(cover.fallbackKind).toBe('generated')
    expect(cover.image).toBeUndefined()
  })

  it('does not throw for malformed URLs', () => {
    expect(resolveCover({ id: '2', title: 'Local note', url: 'not-a-url' }).subtitle).toBe(
      'not-a-url',
    )
  })
})
