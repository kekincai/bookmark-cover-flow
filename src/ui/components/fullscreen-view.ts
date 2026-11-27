import type { CoverItem } from '../../domain/cover'
import { t } from '../../shared/i18n'
import { createAnnouncer, type Announcer } from '../dom/announcer'
import { isUnavailable, setUnavailable } from '../dom/controls'
import { fragment } from '../dom/markup'
import { liquidGlass } from '../glass/lens'
import { createBookmarkMeta } from './bookmark-meta'
import { createCoverFlow, type CoverFlowView } from './cover-flow'
import { icons } from './icons'
import { createScrubber, type ScrubberView } from './scrubber'

export interface FullscreenView {
  readonly element: HTMLDialogElement
  readonly coverFlow: CoverFlowView
  readonly scrubber: ScrubberView
  /**
   * Live regions inside the dialog. Everything outside a modal dialog is inert, so the page's own
   * announcer cannot be heard while full screen is open.
   */
  readonly announcer: Announcer
  readonly isOpen: boolean
  open(): void
  close(): void
  render(position: number, items: readonly CoverItem[], collectionTitle: string): void
  onClose(listener: () => void): void
  onStep(listener: (delta: number) => void): void
  onOpenBookmark(listener: () => void): void
  destroy(): void
}

const OPENING_LABEL_MS = 1400

/**
 * Full-screen Cover Flow as a native modal <dialog>: the browser makes the page inert, contains
 * focus, closes on Esc and returns focus to the invoker.
 */
export function createFullscreenView(): FullscreenView {
  const element = document.createElement('dialog')
  element.className = 'fullscreen'
  // The visible heading changes with every step ("Collection · 3 / 120"), which would make a noisy,
  // ever-changing dialog name; a stable label names the dialog instead.
  element.setAttribute('aria-label', t('enterFullscreen'))

  // Two glow layers cross-fade on opacity when the centered cover's color changes.
  const glows = [document.createElement('div'), document.createElement('div')] as const
  for (const glow of glows) {
    glow.className = 'fullscreen__glow'
    glow.setAttribute('aria-hidden', 'true')
  }
  const closeButton = document.createElement('button')
  closeButton.type = 'button'
  closeButton.className = 'glass glass-button fullscreen__close'
  closeButton.dataset.kind = 'dark'
  closeButton.autofocus = true
  closeButton.setAttribute('aria-label', t('exitFullscreen'))
  closeButton.setAttribute('aria-keyshortcuts', 'Escape F')
  closeButton.append(fragment(icons.close))
  const heading = document.createElement('h1')
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
    button.className = 'glass glass-button fullscreen__step'
    button.dataset.kind = 'dark'
    button.setAttribute('aria-label', label)
    button.append(fragment(icon))
  }
  const openButton = document.createElement('button')
  openButton.type = 'button'
  openButton.className = 'fullscreen__open'
  const openLabel = document.createElement('span')
  openLabel.textContent = t('open')
  openButton.append(openLabel, fragment(icons.open))
  const actions = document.createElement('div')
  actions.className = 'fullscreen__actions'
  actions.append(previous, openButton, next)
  const scrubber = createScrubber('scrubber--fullscreen')
  const footer = document.createElement('div')
  footer.className = 'fullscreen__footer'
  footer.append(meta.element, actions, scrubber.element)
  const announcer = createAnnouncer()
  element.append(...glows, coverFlow.element, closeButton, heading, footer, announcer.element)
  // Rim refraction (Chromium only); each lens refits itself when the overlay is shown.
  const lenses = [closeButton, previous, next].map((button) =>
    liquidGlass(button, { rim: 40, edge: 1.1, power: 2.6, dispersion: 0.15 }),
  )

  let closeListener: () => void = () => undefined
  let step: (delta: number) => void = () => undefined
  let openBookmark: () => void = () => undefined
  let openingTimer = 0
  let renderedHeading = ''
  let glowColor = ''
  let activeGlow = 0

  /** Rendered every animation frame: write the attribute only when availability flips. */
  const updateAvailability = (button: HTMLButtonElement, unavailable: boolean): void => {
    if (isUnavailable(button) !== unavailable) setUnavailable(button, unavailable)
  }
  const resetOpening = (): void => {
    window.clearTimeout(openingTimer)
    openingTimer = 0
    openLabel.textContent = t('open')
  }

  closeButton.addEventListener('click', () => closeListener())
  previous.addEventListener('click', () => {
    if (!isUnavailable(previous)) step(-1)
  })
  next.addEventListener('click', () => {
    if (!isUnavailable(next)) step(1)
  })
  scrubber.onStep((delta) => step(delta))
  openButton.addEventListener('click', () => {
    if (!isUnavailable(openButton)) openBookmark()
  })
  // Fires for every way the dialog closes (Esc, close(), the back gesture), so state stays in step.
  element.addEventListener('close', resetOpening)

  return {
    element,
    coverFlow,
    scrubber,
    announcer,
    get isOpen(): boolean {
      return element.open
    },
    open(): void {
      if (element.open) return
      element.showModal()
    },
    close(): void {
      if (!element.open) return
      element.close()
    },
    render(position, items, collectionTitle): void {
      if (!element.open) return
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
      // Rendered every animation frame: touch the glow only when the color really changes.
      if (item && item.art.background !== glowColor) {
        glowColor = item.art.background
        const outgoing = glows[activeGlow]!
        activeGlow = 1 - activeGlow
        const incoming = glows[activeGlow]!
        incoming.style.backgroundColor = glowColor
        incoming.classList.add('is-active')
        outgoing.classList.remove('is-active')
      }
      updateAvailability(previous, index <= 0)
      updateAvailability(next, index >= items.length - 1)
      updateAvailability(openButton, item === undefined)
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
        openingTimer = window.setTimeout(resetOpening, OPENING_LABEL_MS)
      }
    },
    destroy(): void {
      element.removeEventListener('close', resetOpening)
      window.clearTimeout(openingTimer)
      for (const lens of lenses) lens.destroy()
      coverFlow.destroy()
      if (element.open) element.close()
      element.remove()
    },
  }
}
