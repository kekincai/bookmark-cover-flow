import type { CoverTransform } from '../domain/cover'

/** Smooth through the center and every snap point; no active/inactive transform switch. */
export function getCoverTransform(
  offset: number,
  reducedMotion = false,
  width = 400,
): CoverTransform {
  const distance = Math.abs(offset)
  const prominence = 1 - Math.exp(-distance * distance * 1.5)
  const fade = Math.max(0, Math.min(1, (distance - 3) / 4))
  return {
    x: width * (0.37 * offset + 0.47 * Math.tanh(offset * 1.3)),
    z: 80 - 220 * prominence - 16 * distance * distance,
    rotateY: offset === 0 ? 0 : -(reducedMotion ? 8 : 28) * Math.tanh(offset * 1.5),
    scale: 1 - 0.13 * prominence - 0.035 * Math.log1p(distance * distance),
    opacity: 1 - fade * fade * (3 - 2 * fade),
  }
}
