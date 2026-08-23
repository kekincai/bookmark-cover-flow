import { describe, expect, it } from 'vitest'
import { advanceMotion, isMotionSettled } from '../../src/application/motion'
import type { MotionState } from '../../src/domain/navigation'

describe('motion physics', () => {
  it('moves continuously toward the target and settles without an endless frame loop', () => {
    let state: MotionState = { position: 0, targetPosition: 4, velocity: 0, lastTimestamp: 0 }
    let timestamp = 0

    for (let frame = 0; frame < 600 && !isMotionSettled(state); frame += 1) {
      timestamp += 16.67
      state = advanceMotion(state, timestamp, 8)
    }

    expect(state.position).toBe(4)
    expect(state.velocity).toBe(0)
    expect(isMotionSettled(state)).toBe(true)
    expect(timestamp).toBeLessThanOrEqual(380)
  })

  it('clamps motion to the available item range', () => {
    const state = advanceMotion(
      { position: 2, targetPosition: 20, velocity: 1, lastTimestamp: 10 },
      27,
      5,
    )
    expect(state.position).toBeLessThanOrEqual(5)
  })
})
