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
    // The new critical spring uses a longer, gentle tail, below 600 ms for four cards.
    expect(timestamp).toBeLessThanOrEqual(600)
  })

  it('clamps motion to the available item range', () => {
    const state = advanceMotion(
      { position: 2, targetPosition: 20, velocity: 1, lastTimestamp: 10 },
      27,
      5,
    )
    expect(state.position).toBeLessThanOrEqual(5)
    expect(state.targetPosition).toBe(5)
  })

  it('produces the same trajectory at 60 Hz, 120 Hz and irregular frame intervals', () => {
    const initial: MotionState = { position: 1, targetPosition: 5, velocity: 3, lastTimestamp: 100 }
    const run = (times: number[]): MotionState =>
      times.reduce((state, time) => advanceMotion(state, time, 8), initial)
    const sixty = run(Array.from({ length: 12 }, (_, i) => 100 + ((i + 1) * 200) / 12))
    const oneTwenty = run(Array.from({ length: 24 }, (_, i) => 100 + ((i + 1) * 200) / 24))
    const irregular = run([113, 127, 169, 204, 217, 300])
    expect(sixty.position).toBeCloseTo(oneTwenty.position, 10)
    expect(sixty.velocity).toBeCloseTo(oneTwenty.velocity, 10)
    expect(irregular.position).toBeCloseTo(sixty.position, 10)
  })

  it('preserves continuity when interrupted and reverses without overshooting the boundary', () => {
    let state: MotionState = { position: 2, targetPosition: 5, velocity: 0, lastTimestamp: 100 }
    state = advanceMotion(state, 150, 8)
    const position = state.position
    state = advanceMotion({ ...state, targetPosition: 0 }, 151, 8)
    expect(Math.abs(state.position - position)).toBeLessThan(0.03)
    for (let time = 160; time < 1100; time += 16) {
      state = advanceMotion(state, time, 8)
      expect(state.position).toBeGreaterThanOrEqual(0)
    }
    expect(isMotionSettled(state)).toBe(true)
  })
})
