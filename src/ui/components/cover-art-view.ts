import type { CoverArt } from '../../domain/cover'

const BASE = 240

function text(tag: string, className: string, content: string): HTMLElement {
  const element = document.createElement(tag)
  element.className = className
  element.textContent = content
  return element
}

const shape = (className: string): HTMLElement => {
  const element = document.createElement('i')
  element.className = className
  return element
}

/** Word marks shrink so the longest line still fits inside the 240 px design canvas. */
function wordmarkSize(lines: readonly [string, string]): number {
  const longest = Math.max(...lines.map((line) => Array.from(line).length), 1)
  return Math.min(50, Math.floor((BASE - 36) / (longest * 0.56)))
}

/** Draw the album-style art at 240 px; callers scale it with `--art-scale`. */
export function renderCoverArt(
  container: HTMLElement,
  art: CoverArt,
  title: string,
  hostname: string,
): void {
  container.dataset.template = art.template
  container.style.setProperty('--art-bg', art.background)
  container.style.setProperty('--art-fg', art.foreground)
  container.style.setProperty('--art-accent', art.accent)
  const canvas = document.createElement('span')
  canvas.className = 'cover-art__canvas'
  const caption = document.createElement('span')
  caption.className = 'cover-art__caption'
  const name = text('b', 'cover-art__name', title)
  const host = text('small', 'cover-art__host', hostname)

  if (art.template === 'mono') {
    const glyph = text('span', 'cover-art__glyph', art.glyph)
    if (Array.from(art.glyph).length > 1) glyph.dataset.pair = 'true'
    caption.append(shape('cover-art__rule'), name, host)
    canvas.append(glyph, caption)
  } else if (art.template === 'type') {
    const mark = document.createElement('span')
    mark.className = 'cover-art__mark'
    mark.style.fontSize = `${wordmarkSize(art.lines)}px`
    mark.append(text('span', '', art.lines[0]), text('span', 'cover-art__accent', art.lines[1]))
    caption.classList.add('cover-art__caption--row')
    caption.append(host, shape('cover-art__dot'))
    canvas.append(mark, caption)
  } else if (art.template === 'circle') {
    caption.append(name, host)
    canvas.append(shape('cover-art__disc'), shape('cover-art__ring'), caption)
  } else {
    caption.classList.add('cover-art__caption--top')
    caption.append(name, host)
    canvas.append(shape('cover-art__bands'), caption)
  }
  container.replaceChildren(canvas)
}
