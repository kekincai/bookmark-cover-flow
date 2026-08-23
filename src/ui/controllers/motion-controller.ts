import { advanceMotion, isMotionSettled } from '../../application/motion'
import type { MotionState } from '../../domain/navigation'
import { clamp } from '../../shared/clamp'

export interface MotionController {
  readonly position: number
  setItemCount(count: number): void
  setTarget(index: number, immediate?: boolean): void
  moveTarget(delta: number): void
  scrubTo(position: number): void
  snap(velocity?: number): void
  destroy(): void
}

export function createMotionController(
  render: (position: number) => void,
  onSettle: (index: number) => void,
): MotionController {
  let itemCount = 0
  let frame = 0
  let state: MotionState = { position: 0, targetPosition: 0, velocity: 0, lastTimestamp: 0 }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  const maximum = (): number => Math.max(0, itemCount - 1)

  const stop = (): void => {
    if (frame !== 0) cancelAnimationFrame(frame)
    frame = 0
  }

  const tick = (timestamp: number): void => {
    state = advanceMotion(state, timestamp, maximum())
    render(state.position)
    if (isMotionSettled(state)) {
      frame = 0
      onSettle(Math.round(state.position))
      return
    }
    frame = requestAnimationFrame(tick)
  }

  const start = (): void => {
    if (frame === 0) frame = requestAnimationFrame(tick)
  }

  const setTarget = (index: number, immediate = false): void => {
    const target = clamp(index, 0, maximum())
    if (immediate || reducedMotion.matches) {
      stop()
      state = { position: target, targetPosition: target, velocity: 0, lastTimestamp: 0 }
      render(target)
      onSettle(Math.round(target))
      return
    }
    state = { ...state, targetPosition: target }
    start()
  }

  return {
    get position(): number {
      return state.position
    },
    setItemCount(count): void {
      itemCount = Math.max(0, count)
      const position = clamp(state.position, 0, maximum())
      state = {
        position,
        targetPosition: clamp(state.targetPosition, 0, maximum()),
        velocity: state.velocity,
        lastTimestamp: state.lastTimestamp,
      }
      render(position)
    },
    setTarget,
    moveTarget(delta): void {
      setTarget(state.targetPosition + delta)
    },
    scrubTo(position): void {
      stop()
      const nextPosition = clamp(position, 0, maximum())
      state = { position: nextPosition, targetPosition: nextPosition, velocity: 0, lastTimestamp: 0 }
      render(nextPosition)
    },
    snap(velocity = 0): void {
      const projected = state.position + velocity * 0.18
      state = { ...state, velocity: velocity * 0.012 }
      setTarget(Math.round(projected))
    },
    destroy(): void {
      stop()
    },
  }
}
