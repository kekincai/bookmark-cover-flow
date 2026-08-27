import type { MotionController } from './motion-controller'

export function gestureDistance(element: HTMLElement): number {
  return (element.querySelector<HTMLElement>('.cover-card')?.offsetWidth ?? 400) * 0.85
}
export function attachWheelController(element: HTMLElement, motion: MotionController): () => void {
  let delta = 0
  let frame = 0
  let idle = 0
  let revision = -1
  let axis: 'x' | 'y' | undefined
  let distance = 340
  const flush = (): void => {
    frame = 0
    if (revision === motion.revision) motion.scrubTo(motion.position + delta / distance)
    delta = 0
  }
  const onWheel = (event: WheelEvent): void => {
    if (event.ctrlKey || element.dataset.dragging === 'true') return
    if (!idle || revision !== motion.revision) {
      delta = 0
      motion.interrupt()
      revision = motion.revision
      distance = gestureDistance(element)
      axis = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? 'x' : 'y'
    }
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientWidth : 1
    delta += (axis === 'x' ? event.deltaX : event.deltaY) * unit
    if (!frame) frame = requestAnimationFrame(flush)
    window.clearTimeout(idle)
    idle = window.setTimeout(() => {
      idle = 0
      if (frame) cancelAnimationFrame(frame)
      flush()
      // Trackpads supply their own momentum tail; never add a second fling.
      if (revision === motion.revision) motion.snap()
    }, 160)
    event.preventDefault()
  }
  element.addEventListener('wheel', onWheel, { passive: false })
  return () => {
    element.removeEventListener('wheel', onWheel)
    cancelAnimationFrame(frame)
    window.clearTimeout(idle)
  }
}
