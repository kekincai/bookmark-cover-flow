import type { CoverArt, CoverTemplate } from '../domain/cover'

export const COVER_TEMPLATES: readonly CoverTemplate[] = ['mono', 'type', 'circle', 'bands']

/** Calm, saturated bases for sites that publish neither a theme color nor a usable favicon. */
const FALLBACK_BASES = [
  '#101014',
  '#3178C6',
  '#D71A1B',
  '#0B3D91',
  '#5200FF',
  '#2C2C2E',
  '#1F1B24',
  '#F2EFE8',
  '#6965DB',
  '#2DA44E',
  '#1E6F5C',
  '#FBFAF6',
] as const

const LIGHT_FOREGROUND = '#FFFFFF'
const DARK_FOREGROUND = '#1D1D1F'

interface Rgb {
  readonly r: number
  readonly g: number
  readonly b: number
}

interface Hsl {
  readonly h: number
  readonly s: number
  readonly l: number
}

/** FNV-1a: stable across sessions and machines, so a site always gets the same cover. */
export function hashString(value: string): number {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export const pickCoverTemplate = (hostname: string): CoverTemplate =>
  COVER_TEMPLATES[hashString(hostname) % COVER_TEMPLATES.length] ?? 'mono'

export function parseColor(value: string): string | undefined {
  const color = value.trim().toLowerCase()
  const short = /^#([\da-f])([\da-f])([\da-f])$/.exec(color)
  if (short)
    return `#${short
      .slice(1)
      .map((digit) => digit + digit)
      .join('')}`.toUpperCase()
  if (/^#[\da-f]{6}$/.test(color)) return color.toUpperCase()
  const functional =
    /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/.exec(color)
  if (!functional) return undefined
  const channels = functional.slice(1, 4).map(Number)
  if (channels.some((channel) => channel > 255)) return undefined
  return toHex({ r: channels[0] ?? 0, g: channels[1] ?? 0, b: channels[2] ?? 0 })
}

function toRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16)
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }
}

function toHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b]
    .map((channel) =>
      Math.round(Math.min(255, Math.max(0, channel)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`.toUpperCase()
}

function toHsl({ r, g, b }: Rgb): Hsl {
  const [red, green, blue] = [r / 255, g / 255, b / 255]
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const delta = max - min
  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)
  const h =
    max === red
      ? (green - blue) / delta + (green < blue ? 6 : 0)
      : max === green
        ? (blue - red) / delta + 2
        : (red - green) / delta + 4
  return { h: h * 60, s, l }
}

function fromHsl({ h, s, l }: Hsl): Rgb {
  const hue = (((h % 360) + 360) % 360) / 360
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (offset: number): number => {
    let t = hue + offset
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return (p + (q - p) * 6 * t) * 255
    if (t < 1 / 2) return q * 255
    if (t < 2 / 3) return (p + (q - p) * (2 / 3 - t) * 6) * 255
    return p * 255
  }
  return { r: channel(1 / 3), g: channel(0), b: channel(-1 / 3) }
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = toRgb(hex)
  const linear = (channel: number): number => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

export function contrastRatio(first: string, second: string): number {
  const [light, dark] = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a)
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05)
}

export const pickForeground = (background: string): string =>
  contrastRatio(background, LIGHT_FOREGROUND) >= contrastRatio(background, DARK_FOREGROUND)
    ? LIGHT_FOREGROUND
    : DARK_FOREGROUND

/** `circle` uses the complement; the others use a tint of the base that leans toward the text. */
export function deriveAccent(background: string, template: CoverTemplate, seed = 0): string {
  const base = toHsl(toRgb(background))
  const darkBase = pickForeground(background) === LIGHT_FOREGROUND
  if (template === 'circle' || base.s < 0.15) {
    const hue = base.s < 0.15 ? seed % 360 : base.h + 180
    return toHex(fromHsl({ h: hue, s: Math.max(0.65, base.s), l: darkBase ? 0.6 : 0.45 }))
  }
  return toHex(fromHsl({ h: base.h, s: base.s * 0.35, l: darkBase ? 0.92 : 0.28 }))
}

const firstLetter = (value: string): string => /[\p{L}\p{N}]/u.exec(value)?.[0] ?? '?'

/** Mixed-case Latin names keep their capitals (TypeScript → TS); everything else uses one glyph. */
export function coverGlyph(title: string): string {
  const firstWord = title.trim().split(/\s+/)[0] ?? ''
  if (/^[A-Za-z]+$/.test(firstWord) && /[a-z]/.test(firstWord)) {
    const capitals = firstWord.match(/[A-Z]/g) ?? []
    if (capitals.length >= 2) return capitals.slice(0, 2).join('')
  }
  return firstLetter(title).toLocaleUpperCase()
}

/** Split at a space, then a lower→upper case boundary, then (for CJK) the middle. */
export function splitWordmark(title: string, hostname: string): readonly [string, string] {
  const trimmed = title.trim()
  const space = trimmed.indexOf(' ')
  if (space > 0) return [trimmed.slice(0, space), trimmed.slice(space + 1).trim()]
  const camel = /[a-z][A-Z]/.exec(trimmed)
  if (camel) return [trimmed.slice(0, camel.index + 1), trimmed.slice(camel.index + 1)]
  const characters = Array.from(trimmed)
  if (
    /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(trimmed) &&
    characters.length > 1
  ) {
    const middle = Math.ceil(characters.length / 2)
    return [characters.slice(0, middle).join(''), characters.slice(middle).join('')]
  }
  const suffix = /\.[a-z]{2,}$/i.exec(hostname)?.[0] ?? ''
  return [trimmed, suffix]
}

export function fallbackBaseColor(hostname: string): string {
  return FALLBACK_BASES[(hashString(hostname) >>> 2) % FALLBACK_BASES.length] ?? FALLBACK_BASES[0]
}

export function createCoverArt(title: string, hostname: string, baseColor?: string): CoverArt {
  const template = pickCoverTemplate(hostname)
  const background =
    (baseColor === undefined ? undefined : parseColor(baseColor)) ?? fallbackBaseColor(hostname)
  return {
    template,
    background,
    foreground: pickForeground(background),
    accent: deriveAccent(background, template, hashString(hostname) >>> 5),
    glyph: coverGlyph(title || hostname),
    lines: splitWordmark(title || hostname, hostname),
  }
}
