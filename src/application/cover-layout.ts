import type { CoverTransform } from '../domain/cover'

/** Geometry is specified for a 240 px cover and scales linearly with the real cover size. */
export const BASE_COVER_SIZE = 240
const FIRST_OFFSET = 178
const SPACING = 60
const CENTER_DEPTH = 40
const SIDE_DEPTH = -120
const FADE_START = 7

export interface CoverLayoutOptions {
  readonly angle?: number
  readonly size?: number
}

/** Continuous through every snap point so fractional positions never jump. */
export function getCoverTransform(
  offset: number,
  { angle = 70, size = BASE_COVER_SIZE }: CoverLayoutOptions = {},
): CoverTransform {
  const scale = size / BASE_COVER_SIZE
  const distance = Math.abs(offset)
  const side = Math.sign(offset)
  const toward = Math.min(distance, 1)
  const x = distance < 1 ? offset * FIRST_OFFSET : side * (FIRST_OFFSET + (distance - 1) * SPACING)
  const fade = Math.min(1, Math.max(0, distance - FADE_START))
  return {
    x: x * scale,
    z: (CENTER_DEPTH + (SIDE_DEPTH - CENTER_DEPTH) * toward) * scale,
    rotateY: side * angle * toward,
    opacity: 1 - fade * fade * (3 - 2 * fade),
  }
}

/** Covers closer to the center paint above farther ones; no preserve-3d sorting needed. */
export const coverStackOrder = (offset: number): number => 100 - Math.round(Math.abs(offset) * 10)
