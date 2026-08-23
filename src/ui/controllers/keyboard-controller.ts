import type { NavigationCommand } from '../../domain/navigation'

export function attachKeyboardController(
  dispatch: (command: NavigationCommand) => void,
  searchInput: HTMLInputElement,
): () => void {
  const onKeyDown = (event: KeyboardEvent): void => {
    const isSearchFocused = document.activeElement === searchInput

    if (event.key === 'Escape' && isSearchFocused) {
      searchInput.value = ''
      searchInput.blur()
      dispatch({ type: 'search', query: '' })
      event.preventDefault()
      return
    }
    if (isSearchFocused) return

    const command: NavigationCommand | undefined = (() => {
      if (event.key === 'ArrowLeft') return { type: 'previous' }
      if (event.key === 'ArrowRight') return { type: 'next' }
      if (event.key === 'Enter') return { type: 'open' }
      if (event.key === 'Home') return { type: 'first' }
      if (event.key === 'End') return { type: 'last' }
      return undefined
    })()

    if (command !== undefined) {
      dispatch(command)
      event.preventDefault()
      return
    }

    if (event.key === '/' || (event.key.toLocaleLowerCase() === 'k' && event.metaKey)) {
      searchInput.focus()
      searchInput.select()
      event.preventDefault()
    }
  }

  window.addEventListener('keydown', onKeyDown)
  return () => window.removeEventListener('keydown', onKeyDown)
}
