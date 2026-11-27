/*
 * Rim lens for liquid glass, ported from Glasswork's lens.js
 * (https://github.com/kubai087/glasswork, v1.1.0, MIT License, (c) 2026 Kubai087).
 *
 *   const lens = liquidGlass(element, { rim: 40, edge: 1.1, power: 2.6, dispersion: 0.15 })
 *   lens.destroy()
 *
 * The backdrop under a surface's rim bends inward, like the edge of a thick
 * glass slab, and splits slightly into its colors. An SVG displacement map
 * drives the bend through `backdrop-filter: url(#…)`, which only Chromium
 * draws; elsewhere nothing happens and the CSS glass stays. The element must
 * end its backdrop-filter with `var(--glass-lens,)`.
 *
 * The map is a nine-slice lens: four corner tiles and four edge strips over a
 * flat middle. Tiles are built once per rim and shared by every surface.
 */

export interface LensOptions {
  /** Widest rim in CSS px; small surfaces narrow it. */
  rim: number
  /** How far inward the very edge samples, in rim widths. */
  edge: number
  /** Falloff across the rim: (1 - d / rim) ^ power. */
  power: number
  /** Red bends this much further, blue this much less; 0 for one pass. */
  dispersion: number
  /** Corner radius in px; read from the element when null. */
  radius: number | null
  /** Superellipse exponent (2 is a circle); read from the element when null. */
  corner: number | null
  enabled: boolean
  /** Custom property the filter goes in. */
  property: string
}

export interface LiquidGlassLens {
  readonly supported: boolean
  update(next: Partial<LensOptions>): void
  refresh(): void
  destroy(): void
}

export const LENS_DEFAULTS: LensOptions = {
  rim: 40,
  edge: 1.1,
  power: 2.6,
  dispersion: 0.15,
  radius: null,
  corner: null,
  enabled: true,
  property: '--glass-lens',
}

export const ROUND_CORNER = 2

/** Too small a surface has no flat middle to look through. */
const LENS_MIN_PX = 32
/** While the rim keeps changing, new tiles wait until it has been still this long. */
const SETTLE_MS = 140
const SVG = 'http://www.w3.org/2000/svg'

type Rect = [x: number, y: number, width: number, height: number]
interface Tiles {
  readonly size: number
  readonly urls: readonly string[]
  /** Live lenses drawing with these tiles. */
  users: number
  /** Still reachable from the cache, so more lenses may use them. */
  cached: boolean
  revoked: boolean
}
interface Lens {
  readonly id: string
  readonly host: SVGSVGElement
  readonly filter: SVGFilterElement
  readonly pieces: readonly SVGElement[]
  readonly passes: readonly SVGElement[]
  readonly tiles: Tiles
  /** Removes the filter and lets go of its tiles; safe to call twice. */
  remove(): void
}

/** Only Chromium draws url() in backdrop-filter. */
export function isLensSupported(): boolean {
  if (typeof CSS === 'undefined' || !CSS.supports('backdrop-filter', 'url(#a)')) return false
  const ua = navigator.userAgent
  return /Chrome\//.test(ua) && !/Firefox\//.test(ua)
}

/** Superellipse exponent of a computed CSS corner-shape. */
export function cornerExponent(shape: string): number {
  const value = shape.trim()
  if (value === 'squircle') return 4
  const match = /^superellipse\(\s*([^)\s]+)\s*\)$/.exec(value)
  const k = match ? Number(match[1]) : Number.NaN
  return Number.isFinite(k) && k >= 0 ? 2 ** k : ROUND_CORNER
}

// ---------- The map ----------

function rimStrength(depth: number, power: number): number {
  return depth >= 1 ? 0 : (1 - Math.max(0, depth)) ** power
}

/** Contour radius at `depth` across the rim; tight corners widen toward the rim so the bend turns smoothly. */
function contourRadius(depth: number, radius: number, bezel: number): number {
  if (radius >= bezel) return radius - depth * bezel
  return (1 - depth) * (radius + (bezel - radius) * depth * (2 - depth))
}

function isWithinContour(
  x: number,
  y: number,
  depth: number,
  radius: number,
  bezel: number,
  corner: number,
): boolean {
  const inset = depth * bezel
  if (x < inset || y < inset) return false
  const curve = contourRadius(depth, radius, bezel)
  const center = inset + curve
  if (x >= center || y >= center) return true
  return ((center - x) / curve) ** corner + ((center - y) / curve) ** corner <= 1
}

function bendNearCorner(
  x: number,
  y: number,
  radius: number,
  bezel: number,
  corner: number,
  power: number,
): [number, number] {
  if (isWithinContour(x, y, 1, radius, bezel, corner)) return [0, 0]
  let depth = 0
  if (isWithinContour(x, y, 0, radius, bezel, corner)) {
    // Contours nest, so the depth is found by halving; 14 steps is finer than a pixel.
    let low = 0
    let high = 1
    for (let step = 0; step < 14; step += 1) {
      const middle = (low + high) / 2
      if (isWithinContour(x, y, middle, radius, bezel, corner)) low = middle
      else high = middle
    }
    depth = low
  }
  const strength = rimStrength(depth, power)
  const curve = contourRadius(depth, radius, bezel)
  const center = depth * bezel + curve
  if (x < center && y < center && curve > 0) {
    const nx = Math.max(0, (center - x) / curve) ** (corner - 1)
    const ny = Math.max(0, (center - y) / curve) ** (corner - 1)
    const length = Math.hypot(nx, ny) || 1
    return [(nx / length) * strength, (ny / length) * strength]
  }
  return x < y ? [strength, 0] : [0, strength]
}

/** Inward offset at a point: unit direction times strength (1 at the outer edge, 0 in the middle). */
export function rimDisplacement(
  x: number,
  y: number,
  width: number,
  height: number,
  geometry: { bezel: number; radius: number; corner: number; power: number },
): [number, number] {
  const rim = Math.min(geometry.bezel, height / 2, width / 2)
  const r = Math.max(0, Math.min(geometry.radius, width / 2, height / 2))
  const [inwardX, inwardY] = bendNearCorner(
    Math.min(x, width - x),
    Math.min(y, height - y),
    r,
    rim,
    geometry.corner,
    geometry.power,
  )
  if (inwardX === 0 && inwardY === 0) return [0, 0]
  return [x < width / 2 ? inwardX : -inwardX, y < height / 2 ? inwardY : -inwardY]
}

/** Corners (TL, TR, BL, BR) then edges (top, bottom, left, right). */
function lensLayout(width: number, height: number, size: number): Rect[] {
  const across = Math.max(1, width - size * 2)
  const down = Math.max(1, height - size * 2)
  return [
    [0, 0, size, size],
    [width - size, 0, size, size],
    [0, height - size, size, size],
    [width - size, height - size, size, size],
    [size, 0, across, size],
    [size, height - size, across, size],
    [0, size, size, down],
    [width - size, size, size, down],
  ]
}

/** Tile pixels read off a probe one pixel wider than two tiles. Red is the x bend, green the y bend, 128 none. */
function tilePixels(radius: number, bezel: number, corner: number, power: number) {
  const size = Math.max(1, Math.ceil(Math.max(radius, bezel)))
  const probe = size * 2 + 1
  const geometry = { bezel, radius, corner, power }
  return {
    size,
    tiles: lensLayout(probe, probe, size).map(([left, top, w, h]) => {
      const data = new Uint8ClampedArray(w * h * 4)
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const [dx, dy] = rimDisplacement(left + x + 0.5, top + y + 0.5, probe, probe, geometry)
          const i = (y * w + x) * 4
          data[i] = Math.round(128 + dx * 127)
          data[i + 1] = Math.round(128 + dy * 127)
          data[i + 2] = 128
          data[i + 3] = 255
        }
      }
      return { width: w, height: h, data }
    }),
  }
}

// Decoded before use: a filter whose images are still decoding draws without its blur.
const tileCache = new Map<string, Promise<Tiles>>()
const TILE_CACHE_MAX = 48

function revokeTiles(tiles: Tiles): void {
  if (tiles.revoked) return
  tiles.revoked = true
  for (const url of tiles.urls) if (url.startsWith('blob:')) URL.revokeObjectURL(url)
}

/** Blob URLs go once the tiles are out of the cache and no lens draws with them. */
function releaseTiles(tiles: Tiles): void {
  tiles.users = Math.max(0, tiles.users - 1)
  if (!tiles.cached && tiles.users === 0) revokeTiles(tiles)
}

/** A failed build leaves the cache, so the next fit tries again. */
async function forgetOnFailure(key: string, entry: Promise<Tiles>): Promise<void> {
  try {
    await entry
  } catch {
    if (tileCache.get(key) === entry) tileCache.delete(key)
  }
}

async function evictTiles(entry: Promise<Tiles>): Promise<void> {
  try {
    const tiles = await entry
    tiles.cached = false
    if (tiles.users === 0) revokeTiles(tiles)
  } catch {
    // A failed build made no URLs to revoke.
  }
}

async function tileUrl(tile: { width: number; height: number; data: Uint8ClampedArray }) {
  const canvas = document.createElement('canvas')
  canvas.width = tile.width
  canvas.height = tile.height
  const context = canvas.getContext('2d')
  if (context === null) throw new Error('No 2D canvas for the lens map.')
  const image = context.createImageData(tile.width, tile.height)
  image.data.set(tile.data)
  context.putImageData(image, 0, 0)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  const url = blob ? URL.createObjectURL(blob) : canvas.toDataURL('image/png')
  const decoded = new Image()
  decoded.src = url
  try {
    await decoded.decode()
  } catch {
    // An undecodable tile still works; it just may draw one frame without its blur.
  }
  return url
}

async function buildTiles(
  radius: number,
  bezel: number,
  corner: number,
  power: number,
): Promise<Tiles> {
  const { size, tiles } = tilePixels(radius, bezel, corner, power)
  const settled = await Promise.allSettled(tiles.map(tileUrl))
  const urls = settled.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))
  if (urls.length !== settled.length) {
    for (const url of urls) if (url.startsWith('blob:')) URL.revokeObjectURL(url)
    throw new Error('Unable to build the lens map.')
  }
  return { size, urls, users: 0, cached: true, revoked: false }
}

function lensTiles(radius: number, bezel: number, corner: number, power: number): Promise<Tiles> {
  const key = `${radius}:${bezel}:${corner.toFixed(3)}:${power.toFixed(3)}`
  const cached = tileCache.get(key)
  if (cached) {
    tileCache.delete(key)
    tileCache.set(key, cached)
    return cached
  }
  const entry = buildTiles(radius, bezel, corner, power)
  tileCache.set(key, entry)
  void forgetOnFailure(key, entry)
  while (tileCache.size > TILE_CACHE_MAX) {
    const oldest = tileCache.entries().next().value
    if (oldest === undefined) break
    tileCache.delete(oldest[0])
    void evictTiles(oldest[1])
  }
  return entry
}

// ---------- The filter ----------

function node<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
  parent?: Element,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG, tag)
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, String(value))
  parent?.append(el)
  return el
}

let filterCount = 0

/** One <svg> per filter: adding to a shared one can make Chrome reload every image and drop the blur. */
function buildFilter(width: number, height: number, tiles: Tiles, split: boolean): Lens {
  const id = `liquid-glass-lens-${++filterCount}`
  const host = node('svg', {
    'aria-hidden': 'true',
    width: 0,
    height: 0,
    // Styled from glass.css: the extension CSP blocks inline style attributes.
    class: 'glass-lens-host',
  })
  const filter = node(
    'filter',
    {
      id,
      filterUnits: 'userSpaceOnUse',
      'color-interpolation-filters': 'sRGB',
      x: 0,
      y: 0,
      width,
      height,
    },
    host,
  )
  node('feFlood', { 'flood-color': 'rgb(128,128,128)', result: 'flat' }, filter)
  const rects = lensLayout(width, height, tiles.size)
  const pieces = rects.map(([x, y, w, h], index) =>
    node(
      'feImage',
      {
        href: tiles.urls[index] ?? '',
        preserveAspectRatio: 'none',
        x,
        y,
        width: w,
        height: h,
        result: `t${index}`,
      },
      filter,
    ),
  )
  const merge = node('feMerge', { result: 'map' }, filter)
  node('feMergeNode', { in: 'flat' }, merge)
  rects.forEach((_, index) => node('feMergeNode', { in: `t${index}` }, merge))
  const passes: SVGElement[] = []
  const pass = (): void => {
    passes.push(
      node(
        'feDisplacementMap',
        {
          in: 'SourceGraphic',
          in2: 'map',
          xChannelSelector: 'R',
          yChannelSelector: 'G',
          scale: 0,
        },
        filter,
      ),
    )
  }
  if (split) {
    ;['r', 'g', 'b'].forEach((name, channel) => {
      pass()
      // Keep this channel and alpha: ones on the 4x5 matrix's diagonal.
      const keep = Array.from({ length: 20 }, (_, cell) =>
        Number(cell === channel * 6 || cell === 18),
      ).join(' ')
      node('feColorMatrix', { type: 'matrix', values: keep, result: name }, filter)
    })
    // Screen on single channels is a sum.
    node('feBlend', { in: 'r', in2: 'g', mode: 'screen' }, filter)
    node('feBlend', { in2: 'b', mode: 'screen' }, filter)
  } else {
    pass()
  }
  document.body.append(host)
  tiles.users += 1
  let removed = false
  const remove = (): void => {
    if (removed) return
    removed = true
    host.remove()
    releaseTiles(tiles)
  }
  return { id, host, filter, pieces, passes, tiles, remove }
}

function placeFilter(lens: Lens, width: number, height: number): void {
  lens.filter.setAttribute('width', String(width))
  lens.filter.setAttribute('height', String(height))
  lensLayout(width, height, lens.tiles.size).forEach(([x, y, w, h], index) => {
    const piece = lens.pieces[index]
    if (!piece) return
    piece.setAttribute('x', String(x))
    piece.setAttribute('y', String(y))
    piece.setAttribute('width', String(w))
    piece.setAttribute('height', String(h))
  })
}

// ---------- A surface ----------

/** Gives `el` a rim lens in its --glass-lens property and keeps it fitted as the element resizes. */
export function liquidGlass(el: HTMLElement, options: Partial<LensOptions> = {}): LiquidGlassLens {
  let opts: LensOptions = { ...LENS_DEFAULTS, ...options }
  const supported = isLensSupported()
  if (!supported) {
    return {
      supported,
      update: () => undefined,
      refresh: () => undefined,
      destroy: () => undefined,
    }
  }

  let current: { key: string; lens: Lens; width: number; height: number } | null = null
  let token = 0
  let frame = 0
  let lastChange = 0
  let settle = 0

  const clear = (): void => {
    token += 1
    el.style.removeProperty(opts.property)
    current?.lens.remove()
    current = null
  }

  const setScale = (lens: Lens, bezel: number): void => {
    const scale = 2 * opts.edge * bezel
    const split = lens.passes.length > 1
    lens.passes.forEach((pass, channel) => {
      const share = split ? 1 + (1 - channel) * opts.dispersion : 1
      pass.setAttribute('scale', (scale * share).toFixed(1))
    })
  }

  const resize = (width: number, height: number, bezel: number): void => {
    if (!current) return
    if (current.width !== width || current.height !== height) {
      placeFilter(current.lens, width, height)
      current.width = width
      current.height = height
    }
    setScale(current.lens, bezel)
  }

  // Sizes come from the ResizeObserver, so a fit never forces layout. The corner style is
  // read where style is already clean (the observer callback), or again after update/refresh.
  let box: { width: number; height: number } | null = null
  let shape: { cssRadius: number; corner: number } | null = null
  const readShape = (): { cssRadius: number; corner: number } => {
    const style = getComputedStyle(el)
    return {
      cssRadius: Number.parseFloat(style.borderTopLeftRadius) || 0,
      corner: cornerExponent(style.getPropertyValue('corner-top-left-shape')),
    }
  }

  const fit = async (): Promise<void> => {
    frame = 0
    if (box === null) return
    const { width, height } = box
    if (!opts.enabled || width < LENS_MIN_PX || height < LENS_MIN_PX) {
      clear()
      return
    }
    shape ??= readShape()
    const radius = Math.round(Math.min(opts.radius ?? shape.cssRadius, width / 2, height / 2))
    const corner = opts.corner ?? shape.corner
    const bezel = Math.round(Math.max(4, Math.min(opts.rim, Math.min(width, height) / 3.5)))
    const split = opts.dispersion > 0
    const key = `${radius}:${bezel}:${corner.toFixed(3)}:${opts.power.toFixed(3)}:${split}`
    if (current?.key === key) {
      resize(width, height, bezel)
      return
    }
    const now = performance.now()
    const settling = current !== null && now - lastChange < SETTLE_MS
    lastChange = now
    if (settling) {
      resize(width, height, bezel)
      window.clearTimeout(settle)
      settle = window.setTimeout(schedule, SETTLE_MS)
      return
    }
    // Until new tiles are ready, the lens in use covers the new size.
    resize(width, height, bezel)
    const mine = ++token
    let tiles: Tiles
    try {
      tiles = await lensTiles(radius, bezel, corner, opts.power)
    } catch {
      // No map: the CSS glass (and any lens already in use) stays.
      return
    }
    if (mine !== token) return
    if (tiles.revoked) {
      // Evicted while this fit waited; build afresh.
      schedule()
      return
    }
    const lens = buildFilter(width, height, tiles, split)
    setScale(lens, bezel)
    const previous = current
    current = { key, lens, width, height }
    el.style.setProperty(opts.property, `url(#${lens.id})`)
    // Let the new filter draw before the old one goes.
    if (previous) {
      requestAnimationFrame(() => requestAnimationFrame(() => previous.lens.remove()))
    }
  }

  /** Never rejects: if fitting fails outright, the element falls back to its CSS glass. */
  const fitSafely = async (): Promise<void> => {
    try {
      await fit()
    } catch {
      clear()
    }
  }

  function schedule(): void {
    if (!frame) {
      frame = requestAnimationFrame(() => {
        void fitSafely()
      })
    }
  }

  const observer = new ResizeObserver((entries) => {
    const size = entries.at(-1)?.borderBoxSize[0]
    if (size === undefined) return
    // Border box, as offsetWidth/offsetHeight measured; the lens assumes horizontal writing.
    box = { width: Math.round(size.inlineSize), height: Math.round(size.blockSize) }
    shape = readShape()
    schedule()
  })
  // Fires once on observe, which gives the first size.
  observer.observe(el)

  return {
    supported,
    update(next): void {
      opts = { ...opts, ...next }
      schedule()
    },
    refresh(): void {
      shape = null
      schedule()
    },
    destroy(): void {
      observer.disconnect()
      cancelAnimationFrame(frame)
      window.clearTimeout(settle)
      clear()
    },
  }
}
