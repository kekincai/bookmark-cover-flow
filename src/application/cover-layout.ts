import type { CoverTransform } from '../domain/cover'

const ACTIVE_GAP = 238
const SIDE_STEP = 170

export function getCoverTransform(offset: number, reducedMotion = false): CoverTransform {
  const distance = Math.abs(offset)
  if (distance < 0.001) {
    return { x: 0, z: 80, rotateY: 0, scale: 1, opacity: 1 }
  }

  const direction = Math.sign(offset)
  const x = direction * (ACTIVE_GAP * Math.min(1, distance) + Math.max(0, distance - 1) * SIDE_STEP)
  return {
    x,
    z: -80 - distance * 54,
    rotateY: reducedMotion ? direction * -12 : direction * -48,
    scale: Math.max(0.64, 0.86 - Math.max(0, distance - 1) * 0.06),
    opacity: Math.max(0.28, 0.9 - Math.max(0, distance - 1) * 0.13),
  }
}
