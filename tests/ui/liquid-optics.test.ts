import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  convexSquircle,
  lipSquircle,
  precalculateDisplacements,
} from '../../src/ui/effects/liquid-optics'
import { HDR_SHADER } from '../../src/ui/effects/hdr-glass'

describe('Infinity optical algorithm compatibility', () => {
  it('retains the original convex Snell-law sample values', () => {
    const samples = precalculateDisplacements()
    expect(samples).toHaveLength(128)
    expect(samples.every(Number.isFinite)).toBe(true)
    expect(samples[0]).toBeCloseTo(61.40445839417348, 10)
    expect(samples[32]).toBeCloseTo(20.315259919557967, 10)
    expect(samples[64]).toBeCloseTo(5.1050377035627745, 10)
    expect(convexSquircle(0)).toBe(0)
    expect(convexSquircle(1)).toBe(1)
  })
  it('retains the lip profile with opposing refraction at its edge and center', () => {
    const samples = precalculateDisplacements(55, 63, lipSquircle)
    expect(samples[0]).toBeCloseTo(61.40445839417791, 10)
    expect(samples[32]).toBeCloseTo(-14.651916502883438, 10)
    expect(samples[64]).toBeCloseTo(-41.11264292657302, 10)
    expect(samples.every(Number.isFinite)).toBe(true)
  })
  it('preserves the exact original HDR WGSL shader, not an SDR imitation', () => {
    expect(createHash('sha256').update(HDR_SHADER).digest('hex')).toBe(
      'ae4129d745e1a1ca9abd607ee13ca0f5232187adc8d99b534ecbb042a7e7f978',
    )
  })
})
