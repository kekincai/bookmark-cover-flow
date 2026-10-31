const FOCUSABLE = 'button, input, select, textarea, a[href], [tabindex]'

/** Keep Tab and Shift+Tab inside a modal surface. Call from its keydown handler. */
export function trapTab(container: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') return
  const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (node) => node.tabIndex >= 0 && !node.matches(':disabled') && node.getClientRects().length > 0,
  )
  const first = focusable[0]
  const last = focusable.at(-1)
  if (first === undefined || last === undefined) return
  if (
    event.shiftKey &&
    (document.activeElement === first || !container.contains(document.activeElement))
  ) {
    last.focus()
    event.preventDefault()
  } else if (!event.shiftKey && document.activeElement === last) {
    first.focus()
    event.preventDefault()
  }
}
