import { t } from '../../shared/i18n'
import { icons } from './icons'

export interface TitleBarView {
  readonly element: HTMLElement
  readonly fullscreenButton: HTMLButtonElement
  render(title: string, detail: string): void
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

  const views = document.createElement('div')
  views.className = 'segmented'
  views.setAttribute('role', 'group')
  views.setAttribute('aria-label', t('view'))
  for (const [label, icon, current] of [
    [t('viewCoverFlow'), icons.coverFlow, true],
    [t('viewGrid'), icons.grid, false],
    [t('viewList'), icons.list, false],
  ] as const) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'segmented__option segmented__option--icon'
    button.setAttribute('aria-label', label)
    button.setAttribute('aria-pressed', String(current))
    button.innerHTML = icon
    // Grid and list views are not built yet; their buttons stay visible but inert.
    if (!current) {
      button.disabled = true
      button.title = t('comingSoon')
    }
    views.append(button)
  }

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
    render(nextTitle, nextDetail): void {
      if (title.textContent !== nextTitle) title.textContent = nextTitle
      if (detail.textContent !== nextDetail) detail.textContent = nextDetail
    },
  }
}
