import type { CoverItem } from '../../domain/cover'

function initials(item: CoverItem): string {
  const parts = item.title.split(/\s+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase() ?? '')
    .join('')
}

export function createCoverCard(item: CoverItem, index: number, total: number): HTMLButtonElement {
  const card = document.createElement('button')
  card.className = 'cover-card'
  card.type = 'button'
  card.dataset.index = String(index)
  card.dataset.imageKind = item.imageKind
  card.dataset.visualVariant = String(index % 4)
  card.setAttribute('aria-label', `${item.title}, ${item.subtitle}`)
  card.setAttribute('aria-posinset', String(index + 1))
  card.setAttribute('aria-setsize', String(total))
  card.style.setProperty('--cover-accent', item.accent)

  const mark = document.createElement('span')
  mark.className = 'cover-card__mark'
  mark.textContent = initials(item)

  if (item.image !== undefined && item.imageKind === 'favicon') {
    const image = document.createElement('img')
    image.className = 'cover-card__favicon'
    image.src = item.image
    image.alt = ''
    image.loading = 'lazy'
    image.addEventListener('load', () => mark.classList.add('is-hidden'), { once: true })
    image.addEventListener('error', () => image.remove(), { once: true })
    card.append(image)
  }

  const title = document.createElement('span')
  title.className = 'cover-card__title'
  title.textContent = item.title

  const visual = document.createElement('span')
  visual.className = 'cover-card__visual'
  visual.setAttribute('aria-hidden', 'true')
  const visualCopy = document.createElement('span')
  visualCopy.className = 'cover-card__visual-copy'
  for (let line = 0; line < 5; line += 1) {
    const rule = document.createElement('i')
    rule.style.setProperty('--line', String(line))
    visualCopy.append(rule)
  }
  const visualArt = document.createElement('span')
  visualArt.className = 'cover-card__visual-art'
  visualArt.append(document.createElement('i'), document.createElement('i'))
  visual.append(visualCopy, visualArt)

  const media = document.createElement('span')
  media.className = 'cover-card__media'

  const hostname = document.createElement('span')
  hostname.className = 'cover-card__hostname'
  hostname.textContent = item.subtitle

  card.append(mark, title)

  if (item.image !== undefined && item.imageKind === 'preview') {
    const preview = document.createElement('img')
    preview.className = 'cover-card__preview'
    preview.src = item.image
    preview.alt = ''
    preview.loading = 'lazy'
    preview.referrerPolicy = 'no-referrer'
    preview.addEventListener(
      'error',
      () => {
        preview.replaceWith(visual)
        card.dataset.imageKind = item.fallbackKind
      },
      { once: true },
    )
    media.append(preview)
  } else {
    media.append(visual)
  }

  card.append(media, hostname)
  return card
}
