import { parseColor } from '../application/cover-art'

const cache = new Map<string, Promise<string | undefined>>()

/** Average of the saturated, opaque pixels; near-gray icons give no usable brand color. */
function dominantColor(image: HTMLImageElement): string | undefined {
  const size = 16
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (context === null) return undefined
  context.drawImage(image, 0, 0, size, size)
  const { data } = context.getImageData(0, 0, size, size)
  let red = 0
  let green = 0
  let blue = 0
  let weight = 0
  for (let index = 0; index < data.length; index += 4) {
    const [r = 0, g = 0, b = 0, a = 0] = data.subarray(index, index + 4)
    if (a < 200) continue
    const chroma = Math.max(r, g, b) - Math.min(r, g, b)
    if (chroma < 40) continue
    red += r * chroma
    green += g * chroma
    blue += b * chroma
    weight += chroma
  }
  if (weight === 0) return undefined
  return parseColor(
    `rgb(${Math.round(red / weight)}, ${Math.round(green / weight)}, ${Math.round(blue / weight)})`,
  )
}

/** Never rejects: an icon that fails to load or decode has no brand color. */
async function loadFaviconColor(faviconUrl: string): Promise<string | undefined> {
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = faviconUrl
    // decode() waits for the load, then for decoded pixels; it rejects on a broken image.
    await image.decode()
    return dominantColor(image)
  } catch {
    return undefined
  }
}

/** Chrome's same-origin favicon endpoint, so reading pixels never taints the canvas. */
export function readFaviconColor(faviconUrl: string): Promise<string | undefined> {
  const cached = cache.get(faviconUrl)
  if (cached !== undefined) return cached
  const pending = loadFaviconColor(faviconUrl)
  cache.set(faviconUrl, pending)
  return pending
}
