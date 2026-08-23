import type { CoverItem } from '../../domain/cover'

function initials(item: CoverItem): string {
  const parts = item.title.split(/\s+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase() ?? '')
    .join('')
}

export function createCoverCard(item: CoverItem, index: number): HTMLButtonElement {
  const card = document.createElement('button')
  card.className = 'cover-card'
  card.type = 'button'
  card.dataset.index = String(index)
  card.setAttribute('aria-label', `${item.title}, ${item.subtitle}`)
  card.style.setProperty('--cover-accent', item.accent)

  const mark = document.createElement('span')
  mark.className = 'cover-card__mark'
  mark.textContent = initials(item)

  if (item.image !== undefined) {
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
  for (let line = 0; line < 4; line += 1) {
    const rule = document.createElement('i')
    rule.style.setProperty('--line', String(line))
    visual.append(rule)
  }

  const hostname = document.createElement('span')
  hostname.className = 'cover-card__hostname'
  hostname.textContent = item.subtitle

  card.append(mark, title, visual, hostname)
  return card
}
