import type { CoverItem } from '../../domain/cover'
import { t } from '../../shared/i18n'
import { trapTab } from '../focus-trap'
import { createBookmarkMeta } from './bookmark-meta'
import { createCoverFlow, type CoverFlowView } from './cover-flow'
import { icons } from './icons'
import { createScrubber, type ScrubberView } from './scrubber'

export interface FullscreenView {
  readonly element: HTMLElement
  readonly coverFlow: CoverFlowView
  readonly scrubber: ScrubberView
  readonly isOpen: boolean
  open(): void
  close(): void
  render(position: number, items: readonly CoverItem[], collectionTitle: string): void
  onClose(listener: () => void): void
  onStep(listener: (delta: number) => void): void
  onOpenBookmark(listener: () => void): void
  destroy(): void
}

/** In-page full-screen overlay; Esc stays ours instead of being consumed by the browser. */
export function createFullscreenView(): FullscreenView {
  const element = document.createElement('div')
  element.className = 'fullscreen'
  element.setAttribute('role', 'dialog')
  element.setAttribute('aria-modal', 'true')
  element.setAttribute('aria-label', t('enterFullscreen'))
  element.hidden = true

  const glow = document.createElement('div')
  glow.className = 'fullscreen__glow'
  glow.setAttribute('aria-hidden', 'true')
  const closeButton = document.createElement('button')
  closeButton.type = 'button'
  closeButton.className = 'glass-button fullscreen__close'
  closeButton.setAttribute('aria-label', t('exitFullscreen'))
  closeButton.setAttribute('aria-keyshortcuts', 'Escape F')
  closeButton.innerHTML = icons.close
  const heading = document.createElement('p')
  heading.className = 'fullscreen__heading'

  const coverFlow = createCoverFlow('cover-flow--fullscreen')
  const meta = createBookmarkMeta('bookmark-meta--fullscreen')
  const previous = document.createElement('button')
  const next = document.createElement('button')
  for (const [button, label, icon] of [
    [previous, t('previousBookmark'), icons.previous],
    [next, t('nextBookmark'), icons.next],
  ] as const) {
    button.type = 'button'
    button.className = 'glass-button fullscreen__step'
    button.setAttribute('aria-label', label)
    button.innerHTML = icon
  }
  const openButton = document.createElement('button')
  openButton.type = 'button'
  openButton.className = 'fullscreen__open'
  openButton.innerHTML = `<span></span>${icons.open}`
  const openLabel = openButton.querySelector('span')!
  openLabel.textContent = t('open')
  const actions = document.createElement('div')
  actions.className = 'fullscreen__actions'
  actions.append(previous, openButton, next)
  const scrubber = createScrubber('scrubber--fullscreen')
  const footer = document.createElement('div')
  footer.className = 'fullscreen__footer'
  footer.append(meta.element, actions, scrubber.element)
  element.append(glow, coverFlow.element, closeButton, heading, footer)

  let openState = false
  let returnFocus: HTMLElement | null = null
  let previouslyInert = false
  let closeListener: () => void = () => undefined
  let step: (delta: number) => void = () => undefined
  let openBookmark: () => void = () => undefined
  let openingTimer = 0
  let renderedHeading = ''

  closeButton.addEventListener('click', () => closeListener())
  previous.addEventListener('click', () => step(-1))
  next.addEventListener('click', () => step(1))
  scrubber.onStep((delta) => step(delta))
  openButton.addEventListener('click', () => openBookmark())
  element.addEventListener('keydown', (event) => trapTab(element, event))

  return {
    element,
    coverFlow,
    scrubber,
    get isOpen(): boolean {
      return openState
    },
    open(): void {
      if (openState) return
      openState = true
      returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
      const app = document.querySelector<HTMLElement>('#app')
      previouslyInert = app?.inert ?? false
      if (app) app.inert = true
      element.hidden = false
      closeButton.focus()
    },
    close(): void {
      if (!openState) return
      openState = false
      element.hidden = true
      const app = document.querySelector<HTMLElement>('#app')
      if (app) app.inert = previouslyInert
      returnFocus?.focus({ preventScroll: true })
    },
    render(position, items, collectionTitle): void {
      if (!openState) return
      coverFlow.render(position)
      scrubber.render(position, items.length)
      const index = Math.round(position)
      const item = items[index]
      meta.render(item)
      const nextHeading =
        items.length === 0 ? collectionTitle : `${collectionTitle} · ${index + 1} / ${items.length}`
      if (nextHeading !== renderedHeading) {
        renderedHeading = nextHeading
        heading.textContent = nextHeading
      }
      if (item) element.style.setProperty('--glow', item.art.background)
      previous.disabled = index <= 0
      next.disabled = index >= items.length - 1
      openButton.disabled = item === undefined
    },
    onClose(listener): void {
      closeListener = listener
    },
    onStep(listener): void {
      step = listener
    },
    onOpenBookmark(listener): void {
      openBookmark = () => {
        listener()
        openLabel.textContent = t('opening')
        window.clearTimeout(openingTimer)
        openingTimer = window.setTimeout(() => (openLabel.textContent = t('open')), 1400)
      }
    },
    destroy(): void {
      window.clearTimeout(openingTimer)
      coverFlow.destroy()
      element.remove()
    },
  }
}
