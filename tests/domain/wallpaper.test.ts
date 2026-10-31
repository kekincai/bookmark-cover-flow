import { describe, expect, it } from 'vitest'
import {
  defaultWallpaper,
  MAX_WALLPAPER_BYTES,
  parseWallpaper,
  wallpaperFileKind,
} from '../../src/domain/wallpaper'

describe('local wallpaper validation', () => {
  it('accepts media MIME and missing-MIME MOV files', () => {
    expect(wallpaperFileKind({ name: 'photo.avif', type: 'image/avif', size: 20 })).toBe('image')
    expect(wallpaperFileKind({ name: 'HDR.MOV', type: '', size: 20 })).toBe('video')
    expect(wallpaperFileKind({ name: 'video.webm', type: 'video/webm', size: 20 })).toBe('video')
  })
  it('rejects empty, oversized and non-media files', () => {
    expect(() => wallpaperFileKind({ name: 'a.png', type: 'image/png', size: 0 })).toThrow('empty')
    expect(() =>
      wallpaperFileKind({ name: 'a.mp4', type: 'video/mp4', size: MAX_WALLPAPER_BYTES + 1 }),
    ).toThrow('512 MB')
    expect(() => wallpaperFileKind({ name: 'a.html', type: 'text/html', size: 20 })).toThrow(
      'image or video',
    )
  })
  it('sanitizes stored settings without treating arbitrary values as media', () => {
    expect(parseWallpaper(null)).toEqual(defaultWallpaper)
    expect(parseWallpaper({ kind: 'remote', blur: -2, dim: Infinity, paused: 'false' })).toEqual(
      defaultWallpaper,
    )
    expect(
      parseWallpaper({ kind: 'video', blur: 60, dim: 100, width: NaN, paused: true }),
    ).toMatchObject({ kind: 'video', blur: 40, dim: 80, width: 0, paused: true })
  })
  it('keeps only known built-in presets', () => {
    expect(parseWallpaper({ kind: 'gradient', preset: 'night' }).preset).toBe('night')
    expect(parseWallpaper({ kind: 'gradient', preset: 'neon' }).preset).toBe('default')
  })
})
