export type WallpaperKind = 'gradient' | 'image' | 'video'
/** Built-in stage backgrounds used when no photo or video is chosen. */
export type WallpaperPreset = 'default' | 'mist' | 'night'
export const WALLPAPER_PRESETS: readonly WallpaperPreset[] = ['default', 'mist', 'night']
export const MAX_WALLPAPER_BLUR = 40
export const MAX_WALLPAPER_DIM = 80

export interface WallpaperSettings {
  readonly kind: WallpaperKind
  readonly preset: WallpaperPreset
  readonly name: string
  readonly width: number
  readonly height: number
  readonly blur: number
  readonly dim: number
  readonly paused: boolean
}

export type WallpaperAdjustment = Pick<WallpaperSettings, 'blur' | 'dim' | 'paused'>
export const defaultWallpaper: WallpaperSettings = {
  kind: 'gradient',
  preset: 'default',
  name: '',
  width: 0,
  height: 0,
  blur: 0,
  dim: 0,
  paused: false,
}
export const MAX_WALLPAPER_BYTES = 512 * 1024 * 1024

export function wallpaperFileKind(file: Pick<File, 'name' | 'type' | 'size'>): 'image' | 'video' {
  if (file.size === 0) throw new Error('This file is empty. Choose a photo or video.')
  if (file.size > MAX_WALLPAPER_BYTES) throw new Error('Choose a file smaller than 512 MB.')
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  // Some platforms omit MIME types for MOV/HEVC. Actual decoding is checked before saving.
  if (!file.type && /\.(mp4|mov|m4v|webm|ogv)$/i.test(file.name)) return 'video'
  if (!file.type && /\.(jpe?g|png|webp|avif|gif|bmp|heic|heif)$/i.test(file.name)) return 'image'
  throw new Error('Choose an image or video file supported by Chrome.')
}

export function parseWallpaper(value: unknown): WallpaperSettings {
  if (typeof value !== 'object' || value === null) return defaultWallpaper
  const record = value as Record<string, unknown>
  const number = (key: string, max: number): number =>
    typeof record[key] === 'number' && Number.isFinite(record[key])
      ? Math.min(max, Math.max(0, record[key]))
      : 0
  return {
    kind: record.kind === 'image' || record.kind === 'video' ? record.kind : 'gradient',
    preset: WALLPAPER_PRESETS.includes(record.preset as WallpaperPreset)
      ? (record.preset as WallpaperPreset)
      : 'default',
    name: typeof record.name === 'string' ? record.name.slice(0, 255) : '',
    width: number('width', 65536),
    height: number('height', 65536),
    blur: number('blur', MAX_WALLPAPER_BLUR),
    dim: number('dim', MAX_WALLPAPER_DIM),
    paused: record.paused === true,
  }
}
