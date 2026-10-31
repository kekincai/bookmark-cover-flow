import type { ViewMode } from '../../domain/preferences'
import { t } from '../../shared/i18n'
import { icons } from './icons'

export interface TitleBarView {
  readonly element: HTMLElement
  readonly fullscreenButton: HTMLButtonElement
  render(title: string, detail: string, view: ViewMode): void
  onViewChange(listener: (view: ViewMode) => void): void
}

export function createTitleBar(): TitleBarView {
  const element = document.createElement('header')
  element.className = 'title-bar'
  const heading = document.createElement('div')
  heading.className = 'title-bar__heading'
  const title = document.createElement('h1')
  title.className = 'title-bar__title'
  const detail = document.createElement('span')
  detail.className = 'title-bar__detail'
  detail.setAttribute('aria-live', 'polite')
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
    button.innerHTML = icon
    button.addEventListener('click', () => change(view))
    views.append(button)
    return button
  })

  const fullscreenButton = document.createElement('button')
  fullscreenButton.type = 'button'
  fullscreenButton.className = 'icon-button'
  fullscreenButton.setAttribute('aria-label', t('enterFullscreen'))
  fullscreenButton.setAttribute('aria-keyshortcuts', 'F')
  fullscreenButton.innerHTML = icons.expand

  const tools = document.createElement('div')
  tools.className = 'title-bar__tools'
  tools.append(views, fullscreenButton)
  element.append(heading, tools)

  return {
    element,
    fullscreenButton,
    render(nextTitle, nextDetail, view): void {
      if (title.textContent !== nextTitle) title.textContent = nextTitle
      if (detail.textContent !== nextDetail) detail.textContent = nextDetail
      for (const button of buttons)
        button.setAttribute('aria-pressed', String(button.dataset.view === view))
    },
    onViewChange(listener): void {
      change = listener
    },
  }
}
