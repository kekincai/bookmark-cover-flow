import type { CoverItem } from '../../domain/cover'
import { t } from '../../shared/i18n'
import { html, setMarkup } from '../dom/markup'
import { renderCoverArt } from './cover-art-view'

const renderedItems = new WeakMap<HTMLButtonElement, CoverItem>()
/** The shade leaf receives `--shade-amount` every frame; keep it so nobody queries for it. */
const shades = new WeakMap<HTMLButtonElement, HTMLElement>()
const priorities = new WeakMap<HTMLButtonElement, HTMLImageElement['fetchPriority']>()

const OPEN_ICON = html`<svg viewBox="0 0 10 10" aria-hidden="true">
  <path d="M2 8l6-6M3.2 2H8v4.8" />
</svg>`
const CARD_MARKUP = html`<span class="cover-card__art" aria-hidden="true"
    ><span class="cover-art"></span
    ><span class="cover-card__placeholder"><span class="cover-card__initial"></span></span
    ><span class="cover-card__shade"></span></span
  ><span class="cover-card__hint glass" data-kind="dark" aria-hidden="true"
    ><span class="cover-card__hint-label"></span>${OPEN_ICON}</span
  >`

/** Covers further than this from the selection load at low priority. */
const LOW_PRIORITY_DISTANCE = 4

export function createCoverCard(item: CoverItem, index: number, total: number): HTMLButtonElement {
  const card = document.createElement('button')
  card.className = 'cover-card'
  card.type = 'button'
  setMarkup(card, CARD_MARKUP)
  shades.set(card, card.querySelector<HTMLElement>('.cover-card__shade')!)
  setCoverHint(card, false)
  updateCoverCard(card, item, index, total)
  return card
}

export function getCoverShade(card: HTMLButtonElement): HTMLElement {
  return shades.get(card)!
}

/**
 * Only the centered cover's preview is fetched at high priority; distant covers yield bandwidth.
 * `distance` is the card's distance in covers from the selected index.
 */
export function setCoverPriority(card: HTMLButtonElement, distance: number): void {
  const priority: HTMLImageElement['fetchPriority'] =
    distance === 0 ? 'high' : distance >= LOW_PRIORITY_DISTANCE ? 'low' : 'auto'
  if (priorities.get(card) === priority) return
  priorities.set(card, priority)
  const preview = card.querySelector<HTMLImageElement>('.cover-card__preview')
  if (preview) preview.fetchPriority = priority
}

export function setCoverHint(card: HTMLButtonElement, opening: boolean): void {
  card.querySelector<HTMLElement>('.cover-card__hint-label')!.textContent = opening
    ? t('opening')
    : t('open')
  card.dataset.opening = String(opening)
}

/** The position is part of the name: `aria-posinset`/`aria-setsize` are not supported on buttons. */
function coverLabel(item: CoverItem, index: number, total: number): string {
  return [item.title, item.subtitle, t('positionValue', String(index + 1), String(total))]
    .filter((part) => part !== '')
    .join(', ')
}

/** Update only the changed media; preserve the button, focus and pointer capture. */
export function updateCoverCard(
  card: HTMLButtonElement,
  item: CoverItem,
  index: number,
  total: number,
): void {
  const previous = renderedItems.get(card)
  card.dataset.index = String(index)
  const label = coverLabel(item, index, total)
  if (card.getAttribute('aria-label') !== label) card.setAttribute('aria-label', label)
  if (previous === item) return
  renderedItems.set(card, item)
  card.dataset.bookmarkId = item.bookmarkId
  card.dataset.state = item.imageKind
  if (previous?.art !== item.art) {
    renderCoverArt(
      card.querySelector<HTMLElement>('.cover-art')!,
      item.art,
      item.title,
      item.subtitle,
    )
    card.querySelector<HTMLElement>('.cover-card__initial')!.textContent = item.art.glyph
  }
  if (previous?.image === item.image && previous?.imageKind === item.imageKind) return
  const art = card.querySelector<HTMLElement>('.cover-card__art')!
  const existing = art.querySelector<HTMLImageElement>('.cover-card__preview')
  if (item.imageKind !== 'preview' || !item.image) {
    existing?.remove()
    return
  }
  if (existing?.dataset.src === item.image) return
  existing?.remove()
  const preview = document.createElement('img')
  preview.className = 'cover-card__preview'
  preview.alt = ''
  preview.draggable = false
  preview.decoding = 'async'
  preview.referrerPolicy = 'no-referrer'
  preview.fetchPriority = priorities.get(card) ?? 'auto'
  preview.dataset.src = item.image
  preview.addEventListener(
    'load',
    () => {
      if (renderedItems.get(card)?.image === item.image) preview.dataset.loaded = 'true'
    },
    { once: true },
  )
  // A broken preview reveals the generated art underneath.
  preview.addEventListener('error', () => preview.remove(), { once: true })
  preview.src = item.image
  getCoverShade(card).before(preview)
}
