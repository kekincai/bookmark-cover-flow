import { getCoverTransform } from '../../application/cover-layout'
import type { CoverItem } from '../../domain/cover'
import { createCoverCard, updateCoverCard } from './cover-card'
import { t } from '../../shared/i18n'

export interface CoverFlowView {
  readonly element: HTMLElement
  setItems(items: readonly CoverItem[]): void
  render(position: number): void
  onActivate(listener: (index: number) => void): void
  destroy(): void
}
const VIRTUAL_RADIUS = 7
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
export function createCoverFlow(): CoverFlowView {
  const element = document.createElement('section')
  element.className = 'cover-flow'
  element.setAttribute('aria-label', t('coverFlow'))
  element.setAttribute('aria-roledescription', t('coverFlow'))
  const stage = document.createElement('div')
  stage.className = 'cover-flow__stage'
  element.append(stage)
  let items: readonly CoverItem[] = []
  const cards = new Map<number, HTMLButtonElement>()
  let currentPosition = 0
  let width = 400
  let lastRange = ''
  let movingTimer = 0
  let activate: (index: number) => void = () => undefined
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const observer = new ResizeObserver(() => {
    width = stage.querySelector<HTMLElement>('.cover-card')?.offsetWidth || 400
    render(currentPosition)
  })
  observer.observe(element)

  const reconcile = (force = false): void => {
    const { first, last } = getVirtualRange(items.length, currentPosition)
    const range = `${first}:${last}`
    if (!force && range === lastRange) return
    lastRange = range
    cards.forEach((card, index) => {
      if (index < first || index > last || card.dataset.bookmarkId !== items[index]?.bookmarkId) {
        card.remove()
        cards.delete(index)
      }
    })
    for (let index = first; index <= last; index += 1) {
      const item = items[index]
      if (!item) continue
      const existing = cards.get(index)
      if (existing) updateCoverCard(existing, item, index, items.length)
      else {
        const card = createCoverCard(item, index, items.length)
        card.addEventListener('click', () => {
          if (element.dataset.suppressClick !== 'true') activate(Number(card.dataset.index))
        })
        cards.set(index, card)
        stage.append(card)
      }
    }
  }
  const render = (position: number): void => {
    if (Math.abs(currentPosition - position) > 0.00001) {
      element.dataset.moving = 'true'
      window.clearTimeout(movingTimer)
      movingTimer = window.setTimeout(() => delete element.dataset.moving, 100)
      document.dispatchEvent(new Event('coverflow-motion'))
    }
    currentPosition = position
    const focused = document.activeElement
    const hadFocus = focused instanceof HTMLElement && focused.matches('.cover-card')
    reconcile()
    const selected = Math.round(position)
    element.dataset.position = position.toFixed(5)
    cards.forEach((card, index) => {
      const t = getCoverTransform(index - position, reducedMotion.matches, width)
      card.style.transform = `translate3d(calc(-50% + ${t.x}px), -50%, ${t.z}px) rotateY(${t.rotateY}deg) scale(${t.scale})`
      card.style.opacity = String(t.opacity)
      card.style.zIndex = String(100 - Math.round(Math.abs(index - position) * 10))
      const active = index === selected
      if (card.getAttribute('aria-current') !== String(active)) {
        card.tabIndex = active ? 0 : -1
        card.setAttribute('aria-current', String(active))
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
      width = stage.querySelector<HTMLElement>('.cover-card')?.offsetWidth || 400
    },
    render,
    onActivate(listener): void {
      activate = listener
    },
    destroy(): void {
      observer.disconnect()
      window.clearTimeout(movingTimer)
    },
  }
}
