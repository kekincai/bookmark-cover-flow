import type { MotionState } from '../domain/navigation'
import { clamp } from '../shared/clamp'

export interface MotionConfig {
  readonly stiffness: number
  readonly damping: number
  readonly settleDistance: number
  readonly settleVelocity: number
  readonly maximumVelocity: number
}

export const defaultMotionConfig: MotionConfig = {
  stiffness: 0.24,
  damping: 0.56,
  settleDistance: 0.005,
  settleVelocity: 0.005,
  maximumVelocity: 0.44,
}

export function advanceMotion(
  state: MotionState,
  timestamp: number,
  maximumPosition: number,
  config: MotionConfig = defaultMotionConfig,
): MotionState {
  const elapsed = state.lastTimestamp === 0 ? 16.67 : clamp(timestamp - state.lastTimestamp, 1, 32)
  const frameFactor = elapsed / 16.67
  const distance = state.targetPosition - state.position
  const velocity = clamp(
    (state.velocity + distance * config.stiffness * frameFactor) * config.damping ** frameFactor,
    -config.maximumVelocity,
    config.maximumVelocity,
  )
  const position = clamp(state.position + velocity * frameFactor, 0, maximumPosition)

  if (
    Math.abs(state.targetPosition - position) < config.settleDistance &&
    Math.abs(velocity) < config.settleVelocity
  ) {
    return {
      position: state.targetPosition,
      targetPosition: state.targetPosition,
      velocity: 0,
      lastTimestamp: timestamp,
    }
  }

  return { position, targetPosition: state.targetPosition, velocity, lastTimestamp: timestamp }
}

export const isMotionSettled = (state: MotionState): boolean =>
  state.position === state.targetPosition && state.velocity === 0
