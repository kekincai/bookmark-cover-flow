import type { NavigationCommand } from '../../domain/navigation'

export function attachWheelController(
  element: HTMLElement,
  dispatch: (command: NavigationCommand) => void,
): () => void {
  let accumulatedDelta = 0
  let frame = 0
  let lastNavigationAt = 0

  const flush = (timestamp: number): void => {
    frame = 0
    const threshold = 54
    if (Math.abs(accumulatedDelta) < threshold || timestamp - lastNavigationAt < 56) return

    const steps = Math.min(3, Math.max(1, Math.floor(Math.abs(accumulatedDelta) / threshold)))
    dispatch({ type: 'move', delta: Math.sign(accumulatedDelta) * steps })
    accumulatedDelta *= 0.18
    lastNavigationAt = timestamp
  }

  const onWheel = (event: WheelEvent): void => {
    const primaryDelta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    accumulatedDelta += primaryDelta
    if (frame === 0) frame = requestAnimationFrame(flush)
    event.preventDefault()
  }

  element.addEventListener('wheel', onWheel, { passive: false })
  return () => {
    element.removeEventListener('wheel', onWheel)
    if (frame !== 0) cancelAnimationFrame(frame)
  }
}
