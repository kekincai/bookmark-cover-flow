import { describe, expect, it } from 'vitest'
import { getCoverTransform } from '../../src/application/cover-layout'

describe('getCoverTransform', () => {
  it('keeps the active cover centered, largest, and fully opaque', () => {
    expect(getCoverTransform(0)).toEqual({
      x: 0,
      z: 80,
      rotateY: 0,
      scale: 1,
      opacity: 1,
    })
  })

  it('mirrors side covers and progressively reduces their prominence', () => {
    const left = getCoverTransform(-2)
    const right = getCoverTransform(2)
    const farther = getCoverTransform(4)

    expect(left.x).toBe(-right.x)
    expect(left.rotateY).toBe(-right.rotateY)
    expect(left.scale).toBe(right.scale)
    expect(farther.scale).toBeLessThan(right.scale)
    expect(farther.opacity).toBeLessThan(right.opacity)
  })

  it('reduces rotation when reduced motion is requested', () => {
    expect(Math.abs(getCoverTransform(1, true).rotateY)).toBeLessThan(
      Math.abs(getCoverTransform(1).rotateY),
    )
  })

  it('interpolates continuously as a cover moves away from center', () => {
    const nearCenter = getCoverTransform(0.01)
    const halfway = getCoverTransform(0.5)
    const side = getCoverTransform(1)

    expect(nearCenter.x).toBeCloseTo(2.38)
    expect(halfway.x).toBeCloseTo(side.x / 2)
  })
})
