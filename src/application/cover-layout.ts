import type { CoverTransform } from '../domain/cover'

const ACTIVE_GAP = 292
const SIDE_STEP = 154

export function getCoverTransform(offset: number, reducedMotion = false): CoverTransform {
  const distance = Math.abs(offset)
  if (distance < 0.001) {
    return { x: 0, z: 80, rotateY: 0, scale: 1, opacity: 1 }
  }

  const direction = Math.sign(offset)
  const x = direction * (ACTIVE_GAP * Math.min(1, distance) + Math.max(0, distance - 1) * SIDE_STEP)
  return {
    x,
    z: -92 - distance * 58,
    rotateY: reducedMotion ? direction * -10 : direction * -51,
    scale: Math.max(0.6, 0.84 - Math.max(0, distance - 1) * 0.055),
    opacity: Math.max(0.24, 0.92 - Math.max(0, distance - 1) * 0.12),
  }
}
