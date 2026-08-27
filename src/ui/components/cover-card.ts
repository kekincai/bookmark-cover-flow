import type { CoverItem } from '../../domain/cover'

const renderedItems = new WeakMap<HTMLButtonElement, CoverItem>()
export function createCoverCard(item: CoverItem, index: number, total: number): HTMLButtonElement {
  const card = document.createElement('button')
  card.className = 'cover-card'
  card.type = 'button'
  card.innerHTML = `<span class="cover-card__media" aria-hidden="true"><span class="cover-card__fallback"><span class="cover-card__monogram"></span><span class="cover-card__fallback-domain"></span></span></span><span class="cover-card__footer" data-liquid-item><span class="cover-card__icon" aria-hidden="true"></span><span class="cover-card__copy"><span class="cover-card__title"></span><span class="cover-card__hostname"></span></span><svg class="cover-card__open" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg></span>`
  updateCoverCard(card, item, index, total)
  return card
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
  card.style.setProperty('--cover-accent', item.accent)
  const title = card.querySelector<HTMLElement>('.cover-card__title')!
  const domain = card.querySelector<HTMLElement>('.cover-card__hostname')!
  title.textContent = item.title
  domain.textContent = item.subtitle
  const initials = item.title
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toLocaleUpperCase()
  card.querySelector<HTMLElement>('.cover-card__monogram')!.textContent = initials
  card.querySelector<HTMLElement>('.cover-card__fallback-domain')!.textContent = item.subtitle
  const icon = card.querySelector<HTMLElement>('.cover-card__icon')!
  if (!previous || previous.favicon !== item.favicon) {
    icon.textContent = initials
    if (item.favicon) {
      const favicon = document.createElement('img')
      favicon.className = 'cover-card__favicon'
      favicon.alt = ''
      favicon.draggable = false
      favicon.src = item.favicon
      favicon.addEventListener(
        'load',
        () => {
          if (renderedItems.get(card)?.favicon === item.favicon) icon.replaceChildren(favicon)
        },
        { once: true },
      )
    }
  }
  if (previous?.image === item.image && previous?.imageKind === item.imageKind) return
  const media = card.querySelector<HTMLElement>('.cover-card__media')!
  media.querySelector('.cover-card__preview')?.remove()
  card.dataset.imageKind = item.fallbackKind
  if (item.imageKind === 'preview' && item.image) {
    const preview = document.createElement('img')
    preview.className = 'cover-card__preview'
    preview.alt = ''
    preview.draggable = false
    preview.decoding = 'async'
    preview.referrerPolicy = 'no-referrer'
    preview.addEventListener(
      'load',
      () => {
        if (renderedItems.get(card)?.image !== item.image) return
        card.dataset.imageKind = 'preview'
        preview.dataset.loaded = 'true'
      },
      { once: true },
    )
    preview.addEventListener('error', () => preview.remove(), { once: true })
    preview.src = item.image
    media.append(preview)
  }
}
