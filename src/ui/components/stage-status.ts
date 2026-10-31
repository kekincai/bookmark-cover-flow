import { t } from '../../shared/i18n'
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
  onRetry(listener: () => void): void
  destroy(): void
}

/** Brief loads should not flash a spinner. */
const LOADING_DELAY_MS = 400

export function createStageStatus(): StageStatusView {
  const element = document.createElement('div')
  element.className = 'stage-status'
  element.setAttribute('role', 'status')
  element.hidden = true
  let retry: () => void = () => undefined
  let loadingTimer = 0
  let renderedKey = ''

  const show = (icon: string, title: string, detail: string, action?: HTMLElement): void => {
    element.innerHTML = `<span class="stage-status__icon">${icon}</span><p class="stage-status__title"></p><p class="stage-status__detail"></p>`
    element.querySelector('.stage-status__title')!.textContent = title
    element.querySelector('.stage-status__detail')!.textContent = detail
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
          element.innerHTML = `<span class="spinner" aria-hidden="true">${'<i></i>'.repeat(12)}</span><p class="stage-status__detail"></p>`
          element.querySelector('.stage-status__detail')!.textContent = t('loadingBookmarks')
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
        button.addEventListener('click', () => retry())
        show(icons.warning, t('bookmarksFailed'), t('bookmarksFailedHint'), button)
        element.setAttribute('role', 'alert')
        return
      }
      element.setAttribute('role', 'status')
    },
    onRetry(listener): void {
      retry = listener
    },
    destroy(): void {
      window.clearTimeout(loadingTimer)
    },
  }
}
