import type { CoverItem } from '../../domain/cover'
import { t } from '../../shared/i18n'
import { renderCoverArt } from './cover-art-view'

const renderedItems = new WeakMap<HTMLButtonElement, CoverItem>()
const OPEN_ICON =
  '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 8l6-6M3.2 2H8v4.8"/></svg>'

export function createCoverCard(item: CoverItem, index: number, total: number): HTMLButtonElement {
  const card = document.createElement('button')
  card.className = 'cover-card'
  card.type = 'button'
  card.innerHTML = `<span class="cover-card__art" aria-hidden="true"><span class="cover-art"></span><span class="cover-card__placeholder"><span class="cover-card__initial"></span></span><span class="cover-card__shade"></span></span><span class="cover-card__hint glass" data-kind="dark" aria-hidden="true"><span class="cover-card__hint-label"></span>${OPEN_ICON}</span>`
  setCoverHint(card, false)
  updateCoverCard(card, item, index, total)
  return card
}

export function setCoverHint(card: HTMLButtonElement, opening: boolean): void {
  card.querySelector<HTMLElement>('.cover-card__hint-label')!.textContent = opening
    ? t('opening')
    : t('open')
  card.dataset.opening = String(opening)
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
  card.setAttribute('aria-posinset', String(index + 1))
  card.setAttribute('aria-setsize', String(total))
  if (previous === item) return
  renderedItems.set(card, item)
  card.dataset.bookmarkId = item.bookmarkId
  card.setAttribute('aria-label', `${item.title}, ${item.subtitle}`)
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
  art.querySelector('.cover-card__shade')!.before(preview)
}
