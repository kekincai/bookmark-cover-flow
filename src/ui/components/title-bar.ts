import type { ViewMode } from '../../domain/preferences'
import { t } from '../../shared/i18n'
import { fragment } from '../dom/markup'
import { icons } from './icons'

export interface TitleBarView {
  readonly element: HTMLElement
  readonly fullscreenButton: HTMLButtonElement
  render(title: string, detail: string, view: ViewMode): void
  onViewChange(listener: (view: ViewMode) => void): void
  /** Moves focus to the page title, e.g. before a Retry button is removed from under focus. */
  focusTitle(): void
}

export function createTitleBar(): TitleBarView {
  const element = document.createElement('header')
  element.className = 'title-bar'
  const heading = document.createElement('div')
  heading.className = 'title-bar__heading'
  // `.truncate` holds exactly one <span>; the full title stays in the DOM and the accessible name.
  const title = document.createElement('h1')
  title.className = 'title-bar__title truncate'
  const titleText = document.createElement('span')
  title.append(titleText)
  // Not a live region: it changed on every search keystroke. Bootstrap announces counts, debounced.
  const detail = document.createElement('span')
  detail.className = 'title-bar__detail'
  heading.append(title, detail)

  let change: (view: ViewMode) => void = () => undefined
  const views = document.createElement('div')
  views.className = 'segmented'
  views.setAttribute('role', 'group')
  views.setAttribute('aria-label', t('view'))
  const buttons = (
    [
      ['coverflow', t('viewCoverFlow'), icons.coverFlow],
      ['grid', t('viewGrid'), icons.grid],
      ['list', t('viewList'), icons.list],
    ] as const
  ).map(([view, label, icon]) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'segmented__option segmented__option--icon'
    button.dataset.view = view
    button.setAttribute('aria-label', label)
    button.title = label
    button.append(fragment(icon))
    button.addEventListener('click', () => change(view))
    views.append(button)
    return button
  })

  const fullscreenButton = document.createElement('button')
  fullscreenButton.type = 'button'
  fullscreenButton.className = 'icon-button'
  fullscreenButton.setAttribute('aria-label', t('enterFullscreen'))
  fullscreenButton.setAttribute('aria-keyshortcuts', 'F')
  fullscreenButton.append(fragment(icons.expand))

  // One composite widget with a single tab stop. `focusgroup` would do this natively but needs
  // Chrome 150 (minimum is 135), so this is the roving-tabindex equivalent.
  const tools = document.createElement('div')
  tools.className = 'title-bar__tools'
  tools.setAttribute('role', 'toolbar')
  tools.setAttribute('aria-label', t('view'))
  tools.append(views, fullscreenButton)
  element.append(heading, tools)

  const toolItems: readonly HTMLButtonElement[] = [...buttons, fullscreenButton]
  const setStop = (stop: HTMLButtonElement): void =>
    toolItems.forEach((item) => (item.tabIndex = item === stop ? 0 : -1))
  setStop(toolItems[0]!)
  // Returning to the toolbar (including after a click) lands on the last item used.
  tools.addEventListener('focusin', (event) => {
    const target = event.target as HTMLButtonElement
    if (toolItems.includes(target)) setStop(target)
  })
  tools.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    const index = toolItems.indexOf(document.activeElement as HTMLButtonElement)
    if (index < 0) return
    // Read direction at event time so a runtime change is honored; RTL flips Left/Right.
    const step = getComputedStyle(tools).direction === 'rtl' ? -1 : 1
    const last = toolItems.length - 1
    const next =
      event.key === 'ArrowRight'
        ? (index + step + toolItems.length) % toolItems.length
        : event.key === 'ArrowLeft'
          ? (index - step + toolItems.length) % toolItems.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : undefined
    if (next === undefined) return
    // Handled here: keep these keys away from the global cover-flow keyboard handler.
    event.preventDefault()
    event.stopPropagation()
    toolItems[next]!.focus()
  })

  return {
    element,
    fullscreenButton,
    render(nextTitle, nextDetail, view): void {
      if (titleText.textContent !== nextTitle) titleText.textContent = nextTitle
      if (detail.textContent !== nextDetail) detail.textContent = nextDetail
      for (const button of buttons)
        button.setAttribute('aria-pressed', String(button.dataset.view === view))
    },
    onViewChange(listener): void {
      change = listener
    },
    focusTitle(): void {
      // Programmatically focusable only; it never joins the tab order. (An <h1> without the
      // attribute already reports tabIndex -1, so check the attribute itself.)
      if (!title.hasAttribute('tabindex')) title.tabIndex = -1
      title.focus({ preventScroll: true })
    },
  }
}
