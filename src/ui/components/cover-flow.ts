import { BASE_COVER_SIZE, coverStackOrder, getCoverTransform } from '../../application/cover-layout'
import type { CoverItem } from '../../domain/cover'
import { createCoverCard, setCoverHint, updateCoverCard } from './cover-card'
import { t } from '../../shared/i18n'

export interface CoverFlowView {
  readonly element: HTMLElement
  setItems(items: readonly CoverItem[]): void
  setAngle(angle: number): void
  render(position: number): void
  /** Press feedback and the "Opening…" label on the centered cover. */
  showOpening(): void
  /** Short cross-fade used instead of rotation when motion is reduced. */
  crossFade(): void
  onActivate(listener: (index: number) => void): void
  destroy(): void
}
const VIRTUAL_RADIUS = 7
const OPENING_LABEL_MS = 1400
export function getVirtualRange(
  itemCount: number,
  position: number,
): { readonly first: number; readonly last: number } {
  const selected = Math.round(position)
  return {
    first: Math.max(0, selected - VIRTUAL_RADIUS),
    last: Math.min(itemCount - 1, selected + VIRTUAL_RADIUS),
  }
}
export function createCoverFlow(className = ''): CoverFlowView {
  const element = document.createElement('section')
  element.className = `cover-flow ${className}`.trim()
  element.setAttribute('aria-label', t('coverFlow'))
  element.setAttribute('aria-roledescription', t('coverFlow'))
  const stage = document.createElement('div')
  stage.className = 'cover-flow__stage'
  element.append(stage)
  let items: readonly CoverItem[] = []
  const cards = new Map<number, HTMLButtonElement>()
  let currentPosition = 0
  let size = BASE_COVER_SIZE
  let angle = 70
  let lastRange = ''
  let movingTimer = 0
  let openingTimer = 0
  let activate: (index: number) => void = () => undefined
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const measure = (): void => {
    size = stage.querySelector<HTMLElement>('.cover-card')?.offsetWidth || size
    element.style.setProperty('--art-scale', String(size / BASE_COVER_SIZE))
  }
  const observer = new ResizeObserver(() => {
    measure()
    render(currentPosition)
  })
  observer.observe(element)

  const reconcile = (force = false): void => {
    const { first, last } = getVirtualRange(items.length, currentPosition)
    const range = `${first}:${last}`
    if (!force && range === lastRange) return
    lastRange = range
    // Recycle cards that leave the window: creating reflected covers is costly when scrubbing
    // jumps the whole window every frame.
    const spare: HTMLButtonElement[] = []
    cards.forEach((card, index) => {
      if (index < first || index > last || card.dataset.bookmarkId !== items[index]?.bookmarkId) {
        spare.push(card)
        cards.delete(index)
      }
    })
    for (let index = first; index <= last; index += 1) {
      const item = items[index]
      if (!item) continue
      const existing = cards.get(index)
      if (existing) updateCoverCard(existing, item, index, items.length)
      else {
        const recycled = spare.pop()
        if (recycled) {
          if (recycled.dataset.opening === 'true') setCoverHint(recycled, false)
          updateCoverCard(recycled, item, index, items.length)
          cards.set(index, recycled)
          continue
        }
        const card = createCoverCard(item, index, items.length)
        card.addEventListener('click', () => {
          if (element.dataset.suppressClick !== 'true') activate(Number(card.dataset.index))
        })
        cards.set(index, card)
        stage.append(card)
      }
    }
    spare.forEach((card) => card.remove())
  }
  const render = (position: number): void => {
    if (Math.abs(currentPosition - position) > 0.00001) {
      element.dataset.moving = 'true'
      window.clearTimeout(movingTimer)
      movingTimer = window.setTimeout(() => delete element.dataset.moving, 100)
    }
    currentPosition = position
    const focused = document.activeElement
    const hadFocus = focused instanceof HTMLElement && stage.contains(focused)
    reconcile()
    const selected = Math.round(position)
    element.dataset.position = position.toFixed(5)
    cards.forEach((card, index) => {
      const offset = index - position
      const transform = getCoverTransform(offset, { angle, size })
      card.style.transform = `translate3d(${transform.x}px, 0, ${transform.z}px) rotateY(${transform.rotateY}deg)`
      card.style.opacity = String(transform.opacity)
      card.style.zIndex = String(coverStackOrder(offset))
      card.style.setProperty('--shade-amount', Math.min(1, Math.abs(offset)).toFixed(3))
      card.dataset.side = offset > 0.001 ? 'right' : offset < -0.001 ? 'left' : 'center'
      card.style.pointerEvents = transform.opacity < 0.05 ? 'none' : ''
      const active = index === selected
      if (card.getAttribute('aria-current') !== String(active)) {
        card.tabIndex = active ? 0 : -1
        card.setAttribute('aria-current', String(active))
        if (!active && card.dataset.opening === 'true') setCoverHint(card, false)
      }
    })
    if (hadFocus && focused !== cards.get(selected))
      cards.get(selected)?.focus({ preventScroll: true })
  }
  return {
    element,
    setItems(nextItems): void {
      const preservesPosition =
        nextItems.length === items.length &&
        nextItems.every((item, index) => item.bookmarkId === items[index]?.bookmarkId)
      items = nextItems
      if (!preservesPosition) currentPosition = 0
      reconcile(true)
      measure()
    },
    setAngle(nextAngle): void {
      if (nextAngle === angle) return
      angle = nextAngle
      render(currentPosition)
    },
    render,
    showOpening(): void {
      const card = cards.get(Math.round(currentPosition))
      if (card === undefined) return
      setCoverHint(card, true)
      window.clearTimeout(openingTimer)
      openingTimer = window.setTimeout(() => setCoverHint(card, false), OPENING_LABEL_MS)
      if (!reducedMotion.matches)
        card
          .querySelector('.cover-card__art')
          ?.animate(
            [
              { transform: 'scale(1)' },
              { transform: 'scale(0.97)', offset: 0.33 },
              { transform: 'scale(1)' },
            ],
            { duration: 300, easing: 'cubic-bezier(.22,.8,.24,1)' },
          )
    },
    crossFade(): void {
      stage.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 150, easing: 'linear' })
    },
    onActivate(listener): void {
      activate = listener
    },
    destroy(): void {
      observer.disconnect()
      window.clearTimeout(movingTimer)
      window.clearTimeout(openingTimer)
    },
  }
}
