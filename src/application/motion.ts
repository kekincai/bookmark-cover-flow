import type { MotionState } from '../domain/navigation'
import { clamp } from '../shared/clamp'

export interface MotionConfig {
  readonly frequency: number
  readonly settleDistance: number
  readonly settleVelocity: number
}
export const defaultMotionConfig: MotionConfig = {
  frequency: 15,
  settleDistance: 0.001,
  settleVelocity: 0.015,
}
/** Analytic critical spring. Positions are cards; velocity is cards/second. */
export function advanceMotion(
  state: MotionState,
  timestamp: number,
  maximumPosition: number,
  config: MotionConfig = defaultMotionConfig,
): MotionState {
  const elapsed =
    state.lastTimestamp === 0 ? 1 / 60 : Math.max(0, timestamp - state.lastTimestamp) / 1000
  const target = clamp(state.targetPosition, 0, maximumPosition)
  const displacement = state.position - target
  const impulse = state.velocity + config.frequency * displacement
  const decay = Math.exp(-config.frequency * elapsed)
  const rawPosition = target + (displacement + impulse * elapsed) * decay
  const position = clamp(rawPosition, 0, maximumPosition)
  const velocity =
    position === rawPosition ? (state.velocity - config.frequency * impulse * elapsed) * decay : 0
  if (
    Math.abs(target - position) < config.settleDistance &&
    Math.abs(velocity) < config.settleVelocity
  ) {
    return { position: target, targetPosition: target, velocity: 0, lastTimestamp: timestamp }
  }
  return { position, targetPosition: target, velocity, lastTimestamp: timestamp }
}
export const isMotionSettled = (state: MotionState): boolean =>
  state.position === state.targetPosition && state.velocity === 0
