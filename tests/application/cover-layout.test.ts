import { describe, expect, it } from 'vitest'
import { coverStackOrder, getCoverTransform } from '../../src/application/cover-layout'

describe('getCoverTransform', () => {
  it('brings the centered cover forward and keeps it flat', () => {
    expect(getCoverTransform(0)).toEqual({ x: 0, z: 40, rotateY: 0, opacity: 1 })
  })

  it('places side covers at the specified offsets, depth and angle', () => {
    expect(getCoverTransform(1)).toEqual({ x: 178, z: -120, rotateY: 70, opacity: 1 })
    expect(getCoverTransform(3)).toEqual({ x: 298, z: -120, rotateY: 70, opacity: 1 })
    expect(getCoverTransform(-2)).toEqual({ x: -238, z: -120, rotateY: -70, opacity: 1 })
  })

  it('turns right-hand covers by a positive angle and honors the configured angle', () => {
    expect(getCoverTransform(2, { angle: 45 }).rotateY).toBe(45)
    expect(getCoverTransform(-2, { angle: 80 }).rotateY).toBe(-80)
  })

  it('scales linearly with the cover size', () => {
    const large = getCoverTransform(2, { size: 340 })
    expect(large.x).toBeCloseTo(238 * (340 / 240))
    expect(large.z).toBeCloseTo(-170)
  })

  it('is continuous through the center and every snap point', () => {
    for (const boundary of [-2, -1, 0, 1, 2]) {
      const before = getCoverTransform(boundary - 0.00001)
      const after = getCoverTransform(boundary + 0.00001)
      for (const property of ['x', 'z', 'rotateY', 'opacity'] as const) {
        expect(Math.abs(after[property] - before[property])).toBeLessThan(0.01)
      }
    }
  })

  it('fades smoothly between seven and eight positions away', () => {
    expect(getCoverTransform(7).opacity).toBe(1)
    expect(getCoverTransform(7.5).opacity).toBeCloseTo(0.5)
    expect(getCoverTransform(-8).opacity).toBe(0)
  })

  it('stacks covers nearer the center above farther covers', () => {
    expect(coverStackOrder(0)).toBeGreaterThan(coverStackOrder(0.4))
    expect(coverStackOrder(-1)).toBe(coverStackOrder(1))
    expect(coverStackOrder(1)).toBeGreaterThan(coverStackOrder(2))
  })
})
