import type { NavigationCommand } from '../../domain/navigation'

/** Holding an arrow key advances one cover per 90 ms regardless of the OS repeat rate. */
const REPEAT_INTERVAL_MS = 90
/** Regions that handle their own arrow, Home/End and Enter keys. */
const SELF_NAVIGATING = '.sidebar, .bookmark-list, .settings-dialog'
const TEXT_ENTRY = 'input, textarea, select, [contenteditable="true"]'

export function attachKeyboardController(
  dispatch: (command: NavigationCommand) => void,
  searchInput: HTMLInputElement,
): () => void {
  let lastRepeatAt = 0

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.altKey) return
    const target = event.target instanceof Element ? event.target : null
    const command = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'

    if (event.key === 'Escape') {
      if (target?.closest('.settings-dialog')) return
      if (target === searchInput && searchInput.value === '') searchInput.blur()
      dispatch({ type: 'escape' })
      event.preventDefault()
      return
    }
    if (command) {
      searchInput.focus()
      searchInput.select()
      event.preventDefault()
      return
    }
    if (target?.closest(TEXT_ENTRY) || target?.closest('.settings-dialog')) return
    if (event.ctrlKey && event.key !== 'Enter') return
    if (event.metaKey && event.key !== 'Enter') return

    if (event.key === '/') {
      searchInput.focus()
      searchInput.select()
      event.preventDefault()
      return
    }
    if (event.key.toLowerCase() === 'f' && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
      dispatch({ type: 'toggle-fullscreen' })
      event.preventDefault()
      return
    }

    if (target?.closest(SELF_NAVIGATING)) return
    if (event.key === 'Enter' && target?.closest('button, a') && !target.closest('.cover-card'))
      return

    const navigation: NavigationCommand | undefined = (() => {
      if (event.key === 'ArrowLeft') return { type: 'previous' }
      if (event.key === 'ArrowRight') return { type: 'next' }
      if (event.key === 'Enter') return { type: 'open', background: event.metaKey || event.ctrlKey }
      if (event.key === 'Home') return { type: 'first' }
      if (event.key === 'End') return { type: 'last' }
      if (event.key === 'PageUp') return { type: 'page-previous' }
      if (event.key === 'PageDown') return { type: 'page-next' }
      return undefined
    })()
    if (navigation === undefined) return
    event.preventDefault()
    if (event.repeat) {
      if (event.timeStamp - lastRepeatAt < REPEAT_INTERVAL_MS) return
      lastRepeatAt = event.timeStamp
    } else {
      lastRepeatAt = event.timeStamp
    }
    dispatch(navigation)
  }

  window.addEventListener('keydown', onKeyDown)
  return () => window.removeEventListener('keydown', onKeyDown)
}
