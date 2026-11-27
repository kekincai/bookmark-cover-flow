export interface Announcer {
  /** Visually hidden live regions; mount once, then only their text changes. */
  readonly element: HTMLElement
  /** Polite status message (counts, selection, outcomes). */
  say(message: string): void
  /** Assertive message for errors that need attention now. */
  alert(message: string): void
}

/**
 * Live regions must exist before they speak: a region inserted or unhidden together with its text
 * is not announced reliably. Clearing first lets the same message be announced twice in a row.
 */
export function createAnnouncer({ assertive = true } = {}): Announcer {
  const element = document.createElement('div')
  element.className = 'visually-hidden'
  const status = document.createElement('div')
  status.setAttribute('role', 'status')
  element.append(status)
  // A surface with its own error alert (Settings) only needs the polite region.
  const alert = assertive ? document.createElement('div') : status
  if (assertive) {
    alert.setAttribute('role', 'alert')
    element.append(alert)
  }

  const timers = new Map<HTMLElement, number>()
  const write = (region: HTMLElement, message: string): void => {
    window.clearTimeout(timers.get(region))
    region.textContent = ''
    if (message === '') return
    timers.set(
      region,
      window.setTimeout(() => (region.textContent = message), 50),
    )
  }
  return {
    element,
    say: (message) => write(status, message),
    alert: (message) => write(alert, message),
  }
}
