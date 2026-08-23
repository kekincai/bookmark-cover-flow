import { describe, expect, it } from 'vitest'
import { getVirtualRange } from '../../src/ui/components/cover-flow'

describe('Cover Flow virtualization', () => {
  it('keeps at most 15 covers in the DOM window for a 5,000 item library', () => {
    const range = getVirtualRange(5_000, 2_500)
    expect(range).toEqual({ first: 2493, last: 2507 })
    expect(range.last - range.first + 1).toBeLessThanOrEqual(15)
  })

  it('clamps the virtual window at collection edges', () => {
    expect(getVirtualRange(5_000, 0)).toEqual({ first: 0, last: 7 })
    expect(getVirtualRange(5_000, 4_999)).toEqual({ first: 4992, last: 4999 })
  })
})
