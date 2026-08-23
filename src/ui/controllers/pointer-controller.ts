import type { MotionController } from './motion-controller'

export function attachPointerController(
  element: HTMLElement,
  motion: MotionController,
  activate: (index: number) => void,
): () => void {
  let pointerId: number | undefined
  let startX = 0
  let startPosition = 0
  let lastX = 0
  let lastAt = 0
  let velocity = 0
  let captureElement: HTMLElement | undefined
  let didDrag = false

  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return
    pointerId = event.pointerId
    startX = lastX = event.clientX
    startPosition = motion.position
    lastAt = event.timeStamp
    velocity = 0
    didDrag = false
    captureElement = event.target instanceof HTMLElement ? event.target : element
  }

  const onPointerMove = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) return
    if (Math.abs(startX - event.clientX) > 6) {
      if (!didDrag) captureElement?.setPointerCapture(event.pointerId)
      didDrag = true
      element.dataset.dragging = 'true'
    }
    if (!didDrag) return
    const elapsed = Math.max(1, event.timeStamp - lastAt)
    velocity = (lastX - event.clientX) / elapsed
    lastX = event.clientX
    lastAt = event.timeStamp
    motion.scrubTo(startPosition + (startX - event.clientX) / 210)
  }

  const finish = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) return
    const activationElement = captureElement
    if (captureElement?.hasPointerCapture(event.pointerId) === true) {
      captureElement.releasePointerCapture(event.pointerId)
    }
    pointerId = undefined
    captureElement = undefined
    delete element.dataset.dragging
    if (didDrag) {
      element.dataset.suppressClick = 'true'
      motion.snap(velocity)
      window.setTimeout(() => delete element.dataset.suppressClick, 0)
    } else if (event.type === 'pointerup') {
      const card = activationElement?.closest<HTMLButtonElement>('.cover-card')
      const index = Number(card?.dataset.index)
      if (Number.isInteger(index)) {
        element.dataset.suppressClick = 'true'
        activate(index)
        window.setTimeout(() => delete element.dataset.suppressClick, 0)
      }
    }
  }

  element.addEventListener('pointerdown', onPointerDown)
  element.addEventListener('pointermove', onPointerMove)
  element.addEventListener('pointerup', finish)
  element.addEventListener('pointercancel', finish)
  return () => {
    element.removeEventListener('pointerdown', onPointerDown)
    element.removeEventListener('pointermove', onPointerMove)
    element.removeEventListener('pointerup', finish)
    element.removeEventListener('pointercancel', finish)
  }
}
