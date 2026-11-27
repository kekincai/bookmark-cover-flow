import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

// Draws the Bookmark Shelf icon with the Canvas 2D API (inside headless Chromium,
// so no native canvas package is needed) and writes every PNG the extension ships.
//
// The mark: a vermilion bookmark standing in front of covers that recede on both
// sides and fade from persimmon to gold — a shelf of covers mid-flip — on a warm
// paper tile. The 16 px and 32 px icons are not downscaled from the master; they
// use their own pixel-snapped geometry so every edge lands on a whole pixel.

const OUTPUTS = [
  { size: 16, path: 'public/icons/icon-16.png' },
  { size: 32, path: 'public/icons/icon-32.png' },
  { size: 48, path: 'public/icons/icon-48.png' },
  { size: 128, path: 'public/icons/icon-128.png' },
  { size: 1024, path: 'docs/assets/icon-1024.png' },
]

const PALETTE = {
  // Paper tile, top to bottom, and the hairline that keeps it visible on white.
  paperTop: '#FFFDF8',
  paperBottom: '#F1E7D4',
  paperEdge: 'rgba(104, 78, 42, 0.22)',
  paperEdgeSmall: 'rgba(104, 78, 42, 0.20)',
  paperWarmth: 'rgba(255, 196, 120, 0.30)',
  // Front bookmark: vermilion.
  vermilionTop: '#F4613F',
  vermilionBottom: '#CC301C',
  // First pair of covers behind it: persimmon.
  persimmonTop: '#F9A150',
  persimmonBottom: '#EE7B31',
  // Furthest pair: gold.
  goldTop: '#FCCD7C',
  goldBottom: '#F3AE48',
  // Light and shade.
  sheen: 'rgba(255, 255, 255, 0.16)',
  rimLight: 'rgba(255, 255, 255, 0.45)',
  castShadow: 'rgba(122, 44, 12, 0.38)',
}

// All geometry is expressed in a 1024-unit design space. `grid(size)` converts
// whole-pixel coordinates of a small icon into that space.
const grid = (size) => (px) => (px * 1024) / size

/**
 * A cover seen behind the bookmark, described by its right-hand copy (the left
 * one is mirrored): a quad from a hidden inner edge to the visible outer edge.
 * On the master the outer edge is shorter, so the cover leans away in perspective.
 */
const MASTER_GEOMETRY = {
  detail: 'full',
  front: { left: 326, right: 698, top: 204, bottom: 826, radius: 50, notch: 116 },
  covers: [
    // Furthest first, so nearer shapes paint over it.
    {
      tone: 'gold',
      inner: 760,
      outer: 918,
      topInner: 300,
      topOuter: 328,
      bottomInner: 728,
      bottomOuter: 700,
      radius: 30,
    },
    {
      tone: 'persimmon',
      inner: 640,
      outer: 824,
      topInner: 236,
      topOuter: 270,
      bottomInner: 792,
      bottomOuter: 758,
      radius: 38,
    },
  ],
}

function smallGeometry(size) {
  const g = grid(size)
  if (size === 16) {
    return {
      detail: 'minimal',
      front: { left: g(5), right: g(11), top: g(2), bottom: g(14), radius: g(0.75), notch: g(3) },
      covers: [
        cover('gold', g, { inner: 12, outer: 14, top: 5, bottom: 10, radius: 0.5 }),
        cover('persimmon', g, { inner: 10, outer: 13, top: 4, bottom: 12, radius: 0.5 }),
      ],
    }
  }
  return {
    detail: 'reduced',
    front: { left: g(10), right: g(22), top: g(4), bottom: g(28), radius: g(1.5), notch: g(5) },
    covers: [
      cover('gold', g, { inner: 24, outer: 29, top: 10, bottom: 21, radius: 1 }),
      cover('persimmon', g, { inner: 20, outer: 26, top: 7, bottom: 24, radius: 1 }),
    ],
  }
}

function cover(tone, g, { inner, outer, top, bottom, radius }) {
  return {
    tone,
    inner: g(inner),
    outer: g(outer),
    topInner: g(top),
    topOuter: g(top),
    bottomInner: g(bottom),
    bottomOuter: g(bottom),
    radius: g(radius),
  }
}

// Mid sizes reuse the master but move its straight edges onto whole pixels.
function snappedMaster(size) {
  const unit = 1024 / size
  const snap = (value) => Math.round(value / unit) * unit
  const { front, covers } = MASTER_GEOMETRY
  return {
    detail: 'full',
    front: {
      ...front,
      left: snap(front.left),
      right: snap(front.right),
      top: snap(front.top),
      bottom: snap(front.bottom),
    },
    covers: covers.map((shape) => ({ ...shape, outer: snap(shape.outer) })),
  }
}

function geometryFor(size) {
  if (size <= 32) return smallGeometry(size)
  return size < 1024 ? snappedMaster(size) : MASTER_GEOMETRY
}

/** Runs in the page: paints one icon and returns it as a PNG data URL. */
function paintIcon({ size, palette, geometry }) {
  const UNITS = 1024
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const scale = size / UNITS
  ctx.scale(scale, scale)
  const full = geometry.detail === 'full'

  const vertical = (top, bottom, from, to) => {
    const gradient = ctx.createLinearGradient(0, top, 0, bottom)
    gradient.addColorStop(0, from)
    gradient.addColorStop(1, to)
    return gradient
  }

  // Shadow distances ignore the canvas transform, so scale them by hand.
  const castShadow = (blur, offsetY) => {
    ctx.shadowColor = palette.castShadow
    ctx.shadowBlur = blur * scale
    ctx.shadowOffsetY = offsetY * scale
  }

  // Superellipse tile: continuous corners, full bleed.
  const tilePath = () => {
    const half = UNITS / 2
    const exponent = 2 / 5
    ctx.beginPath()
    for (let step = 0; step < 720; step++) {
      const angle = (step / 720) * Math.PI * 2
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const x = half + half * Math.sign(cos) * Math.abs(cos) ** exponent
      const y = half + half * Math.sign(sin) * Math.abs(sin) ** exponent
      if (step === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
  }

  const bookmarkPath = ({ left, right, top, bottom, radius, notch }) => {
    ctx.beginPath()
    ctx.moveTo(left, top + radius)
    ctx.arcTo(left, top, left + radius, top, radius)
    ctx.arcTo(right, top, right, top + radius, radius)
    ctx.lineTo(right, bottom)
    ctx.lineTo((left + right) / 2, bottom - notch)
    ctx.lineTo(left, bottom)
    ctx.closePath()
  }

  // `side` is 1 for the right-hand cover, -1 for its mirror image.
  const coverPath = (shape, side) => {
    const x = (value) => UNITS / 2 + side * (value - UNITS / 2)
    ctx.beginPath()
    ctx.moveTo(x(shape.inner), shape.topInner)
    ctx.arcTo(x(shape.outer), shape.topOuter, x(shape.outer), shape.bottomOuter, shape.radius)
    ctx.arcTo(x(shape.outer), shape.bottomOuter, x(shape.inner), shape.bottomInner, shape.radius)
    ctx.lineTo(x(shape.inner), shape.bottomInner)
    ctx.closePath()
  }

  const tones = {
    gold: [palette.goldTop, palette.goldBottom],
    persimmon: [palette.persimmonTop, palette.persimmonBottom],
  }

  // A thin light line along the top edge of the current path.
  const rimLight = (top, width) => {
    ctx.save()
    ctx.clip()
    ctx.lineWidth = width * 2
    const fade = ctx.createLinearGradient(0, top, 0, top + 90)
    fade.addColorStop(0, palette.rimLight)
    fade.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.strokeStyle = fade
    ctx.stroke()
    ctx.restore()
  }

  // --- Tile -----------------------------------------------------------------
  tilePath()
  ctx.fillStyle = vertical(0, UNITS, palette.paperTop, palette.paperBottom)
  ctx.fill()

  ctx.save()
  tilePath()
  ctx.clip()
  if (full) {
    // Warm light behind the covers.
    const warmth = ctx.createRadialGradient(512, 500, 0, 512, 500, 560)
    warmth.addColorStop(0, palette.paperWarmth)
    warmth.addColorStop(1, 'rgba(255, 196, 120, 0)')
    ctx.fillStyle = warmth
    ctx.fillRect(0, 0, UNITS, UNITS)
  }
  // One-device-pixel hairline just inside the edge (half of the stroke is clipped).
  tilePath()
  ctx.lineWidth = (2 * Math.max(1, size / 256)) / scale
  ctx.strokeStyle = full ? palette.paperEdge : palette.paperEdgeSmall
  ctx.stroke()
  ctx.restore()

  // --- Receding covers --------------------------------------------------------
  for (const shape of geometry.covers) {
    const [from, to] = tones[shape.tone]
    for (const side of [-1, 1]) {
      ctx.save()
      if (full) castShadow(34, 14)
      coverPath(shape, side)
      ctx.fillStyle = vertical(shape.topOuter, shape.bottomOuter, from, to)
      ctx.fill()
      ctx.restore()
      if (full) {
        coverPath(shape, side)
        rimLight(shape.topInner, 5)
      }
    }
  }

  // --- Front bookmark ---------------------------------------------------------
  const front = geometry.front
  ctx.save()
  if (full) castShadow(52, 22)
  bookmarkPath(front)
  ctx.fillStyle = vertical(front.top, front.bottom, palette.vermilionTop, palette.vermilionBottom)
  ctx.fill()
  ctx.restore()

  if (full) {
    // Diagonal sheen, then a rim of light along the top edge.
    ctx.save()
    bookmarkPath(front)
    ctx.clip()
    const sheen = ctx.createLinearGradient(front.left, front.top, front.right, front.bottom)
    sheen.addColorStop(0, palette.sheen)
    sheen.addColorStop(0.55, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = sheen
    ctx.fillRect(front.left, front.top, front.right - front.left, front.bottom - front.top)
    ctx.restore()
    bookmarkPath(front)
    rimLight(front.top, 6)
  }

  return canvas.toDataURL('image/png')
}

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 })
  await page.setContent('<!doctype html><title>Bookmark Shelf icon</title>')
  for (const { size, path } of OUTPUTS) {
    const dataUrl = await page.evaluate(paintIcon, {
      size,
      palette: PALETTE,
      geometry: geometryFor(size),
    })
    const file = resolve(path)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'))
  }
  console.log(`Drew ${OUTPUTS.map(({ size }) => `${size}px`).join(', ')} icons.`)
} finally {
  await browser.close()
}
