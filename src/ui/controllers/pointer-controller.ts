import type { MotionController } from './motion-controller'
import { gestureDistance } from './wheel-controller'

export function attachPointerController(
  element: HTMLElement,
  motion: MotionController,
): () => void {
  let pointerId: number | undefined
  let startX = 0
  let startPosition = 0
  let lastX = 0
  let lastAt = 0
  let velocity = 0
  let distance = 60
  let didDrag = false
  let pendingPosition = 0
  let frame = 0
  let revision = -1
  let suppressTimer = 0
  const lifetime = new AbortController()
  // Move/up/cancel listeners exist only for the length of one gesture.
  let gesture: AbortController | undefined
  const flush = (): void => {
    frame = 0
    if (revision === motion.revision) {
      motion.scrubTo(pendingPosition)
      if (motion.position !== pendingPosition) {
        // Rebase at an edge so reversing direction has no overscroll dead zone.
        startPosition = pendingPosition = motion.position
        startX = lastX
        velocity = 0
      }
    }
  }
  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || pointerId !== undefined) return
    motion.interrupt()
    revision = motion.revision
    pointerId = event.pointerId
    startX = lastX = event.clientX
    startPosition = pendingPosition = motion.position
    lastAt = event.timeStamp
    velocity = 0
    distance = gestureDistance(element)
    didDrag = false
    delete element.dataset.suppressClick
    gesture?.abort()
    gesture = new AbortController()
    const options = { signal: AbortSignal.any([lifetime.signal, gesture.signal]) }
    window.addEventListener('pointermove', onPointerMove, options)
    window.addEventListener('pointerup', finish, options)
    window.addEventListener('pointercancel', finish, options)
    element.addEventListener('lostpointercapture', finish, options)
  }
  const onPointerMove = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId || revision !== motion.revision) return
    if (Math.abs(startX - event.clientX) > 5 && !didDrag) {
      didDrag = true
      element.setPointerCapture(event.pointerId)
      element.dataset.dragging = 'true'
    }
    if (!didDrag) return
    const elapsed = Math.max(1, event.timeStamp - lastAt)
    const sample = ((lastX - event.clientX) / distance / elapsed) * 1000
    velocity += (sample - velocity) * (1 - Math.exp(-elapsed / 40))
    lastX = event.clientX
    lastAt = event.timeStamp
    pendingPosition = startPosition + (startX - event.clientX) / distance
    if (!frame) frame = requestAnimationFrame(flush)
  }
  const finish = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) return
    pointerId = undefined
    gesture?.abort()
    gesture = undefined
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId)
    delete element.dataset.dragging
    if (frame) {
      cancelAnimationFrame(frame)
      flush()
    }
    if (didDrag || event.type !== 'pointerup') {
      element.dataset.suppressClick = 'true'
      window.clearTimeout(suppressTimer)
      suppressTimer = window.setTimeout(() => delete element.dataset.suppressClick, 250)
      if (revision === motion.revision)
        motion.snap(event.type === 'pointerup' && event.timeStamp - lastAt < 80 ? velocity : 0)
    } else if (revision === motion.revision) {
      motion.snap()
    }
  }
  const preventNativeDrag = (event: DragEvent): void => event.preventDefault()
  element.addEventListener('pointerdown', onPointerDown, { signal: lifetime.signal })
  element.addEventListener('dragstart', preventNativeDrag, { signal: lifetime.signal })
  return () => {
    lifetime.abort()
    pointerId = undefined
    cancelAnimationFrame(frame)
    window.clearTimeout(suppressTimer)
  }
}
