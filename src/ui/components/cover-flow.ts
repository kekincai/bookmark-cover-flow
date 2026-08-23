import { getCoverTransform } from '../../application/cover-layout'
import type { CoverItem } from '../../domain/cover'
import { createCoverCard } from './cover-card'

export interface CoverFlowView {
  readonly element: HTMLElement
  setItems(items: readonly CoverItem[]): void
  render(position: number): void
  onActivate(listener: (index: number) => void): void
}

const VIRTUAL_RADIUS = 7

export function createCoverFlow(): CoverFlowView {
  const element = document.createElement('section')
  element.className = 'cover-flow'
  element.setAttribute('aria-label', 'Bookmark cover flow')
  const stage = document.createElement('div')
  stage.className = 'cover-flow__stage'
  element.append(stage)

  let items: readonly CoverItem[] = []
  let cards = new Map<number, HTMLButtonElement>()
  let currentPosition = 0
  let activate: (index: number) => void = () => undefined
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  const reconcile = (): void => {
    const selected = Math.round(currentPosition)
    const first = Math.max(0, selected - VIRTUAL_RADIUS)
    const last = Math.min(items.length - 1, selected + VIRTUAL_RADIUS)
    const needed = new Set<number>()

    for (let index = first; index <= last; index += 1) {
      needed.add(index)
      if (!cards.has(index)) {
        const item = items[index]
        if (item === undefined) continue
        const card = createCoverCard(item, index)
        card.addEventListener('click', () => {
          if (element.dataset.suppressClick !== 'true') activate(index)
        })
        cards.set(index, card)
        stage.append(card)
      }
    }

    cards.forEach((card, index) => {
      if (!needed.has(index)) {
        card.remove()
        cards.delete(index)
      }
    })
  }

  return {
    element,
    setItems(nextItems): void {
      const preservesPosition =
        nextItems.length === items.length &&
        nextItems.every((item, index) => item.bookmarkId === items[index]?.bookmarkId)
      items = nextItems
      cards.forEach((card) => card.remove())
      cards = new Map()
      if (!preservesPosition) currentPosition = 0
      reconcile()
    },
    render(position): void {
      currentPosition = position
      reconcile()
      const selected = Math.round(position)
      const hadCoverFocus =
        document.activeElement instanceof HTMLButtonElement &&
        document.activeElement.classList.contains('cover-card')
      cards.forEach((card, index) => {
        const transform = getCoverTransform(index - position, reducedMotion.matches)
        card.style.setProperty('--x', `${transform.x}px`)
        card.style.setProperty('--z', `${transform.z}px`)
        card.style.setProperty('--rotate-y', `${transform.rotateY}deg`)
        card.style.setProperty('--scale', String(transform.scale))
        card.style.setProperty('--opacity', String(transform.opacity))
        card.style.zIndex = String(100 - Math.round(Math.abs(index - position) * 10))
        card.tabIndex = index === selected ? 0 : -1
        card.setAttribute('aria-current', index === selected ? 'true' : 'false')
      })
      if (hadCoverFocus) cards.get(selected)?.focus({ preventScroll: true })
    },
    onActivate(listener): void {
      activate = listener
    },
  }
}
