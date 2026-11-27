import { t } from '../../shared/i18n'
import { fragment, type Markup } from '../dom/markup'
import { icons } from './icons'

export type StageState =
  | { readonly kind: 'ready' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'empty'; readonly title: string; readonly detail: string }
  | { readonly kind: 'no-results'; readonly query: string }
  | { readonly kind: 'error' }

export interface StageStatusView {
  readonly element: HTMLElement
  render(state: StageState): void
  /**
   * Called when Retry is pressed. The retry re-renders this panel, which removes the focused
   * button; the listener must move focus somewhere stable first (bootstrap focuses the page
   * title via `TitleBarView.focusTitle()`) so it never falls back to <body>.
   */
  onRetry(listener: () => void): void
  destroy(): void
}

/** Brief loads should not flash a spinner. */
const LOADING_DELAY_MS = 400

/**
 * The visible loading / empty / error panel.
 *
 * Deliberately not a live region: a region that is unhidden or filled together with its text is
 * not announced reliably, and a second region would repeat what bootstrap's page-level announcer
 * already says. Bootstrap announces state changes; this panel only shows them.
 */
export function createStageStatus(): StageStatusView {
  const element = document.createElement('div')
  element.className = 'stage-status'
  element.hidden = true
  let retry: () => void = () => undefined
  let loadingTimer = 0
  let renderedKey = ''

  const paragraph = (className: string, text: string): HTMLParagraphElement => {
    const node = document.createElement('p')
    node.className = className
    node.textContent = text
    return node
  }

  const show = (icon: Markup, title: string, detail: string, action?: HTMLElement): void => {
    const iconWrap = document.createElement('span')
    iconWrap.className = 'stage-status__icon'
    iconWrap.append(fragment(icon))
    element.replaceChildren(
      iconWrap,
      paragraph('stage-status__title', title),
      paragraph('stage-status__detail', detail),
    )
    if (action) element.append(action)
    element.hidden = false
  }

  return {
    element,
    render(state): void {
      const key = JSON.stringify(state)
      if (key === renderedKey) return
      renderedKey = key
      window.clearTimeout(loadingTimer)
      element.hidden = true
      element.dataset.kind = state.kind
      element.replaceChildren()
      if (state.kind === 'loading') {
        loadingTimer = window.setTimeout(() => {
          // No `value`: an indeterminate <progress> is both the spinner and its semantics.
          const spinner = document.createElement('progress')
          spinner.className = 'spinner'
          spinner.setAttribute('aria-label', t('loadingBookmarksLabel'))
          // The progress bar already carries the name; hide the visible caption from AT so it
          // is not read twice.
          const detail = paragraph('stage-status__detail', t('loadingBookmarks'))
          detail.setAttribute('aria-hidden', 'true')
          element.replaceChildren(spinner, detail)
          element.hidden = false
        }, LOADING_DELAY_MS)
      } else if (state.kind === 'empty') {
        show(icons.emptyFolder, state.title, state.detail)
      } else if (state.kind === 'no-results') {
        show(icons.noResults, t('noResultsFor', state.query), t('tryOtherKeywords'))
      } else if (state.kind === 'error') {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'pill-button'
        button.textContent = t('retry')
        // The listener is responsible for moving focus off this button before the panel
        // re-renders (see `onRetry`).
        button.addEventListener('click', () => retry())
        show(icons.warning, t('bookmarksFailed'), t('bookmarksFailedHint'), button)
      }
    },
    onRetry(listener): void {
      retry = listener
    },
    destroy(): void {
      window.clearTimeout(loadingTimer)
    },
  }
}
