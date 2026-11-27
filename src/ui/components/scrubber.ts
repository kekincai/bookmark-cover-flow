import { t } from '../../shared/i18n'
import { isUnavailable, setUnavailable } from '../dom/controls'
import { fragment } from '../dom/markup'
import { icons } from './icons'

export interface ScrubberView {
  readonly element: HTMLElement
  readonly input: HTMLInputElement
  render(position: number, count: number): void
  onSeek(listener: (index: number) => void): void
  onStep(listener: (delta: number) => void): void
}

/** Visible covers (±7) relative to the whole collection decide the thumb width. */
const VISIBLE_COVERS = 15
const MIN_THUMB = 24

export function createScrubber(className = ''): ScrubberView {
  const element = document.createElement('div')
  element.className = `scrubber ${className}`.trim()
  const previous = document.createElement('button')
  const next = document.createElement('button')
  for (const [button, label, icon] of [
    [previous, t('previousBookmark'), icons.previous],
    [next, t('nextBookmark'), icons.next],
  ] as const) {
    button.type = 'button'
    button.className = 'icon-button scrubber__step'
    button.setAttribute('aria-label', label)
    button.append(fragment(icon))
  }
  const input = document.createElement('input')
  input.type = 'range'
  input.className = 'scrubber__range'
  input.min = '0'
  input.step = '1'
  input.setAttribute('aria-label', t('position'))
  element.append(previous, input, next)

  let seek: (index: number) => void = () => undefined
  let step: (delta: number) => void = () => undefined
  let rendered = ''
  let count = 0
  /** From ResizeObserver entries only, so rendering never forces a synchronous layout. */
  let width = 0
  const sizeThumb = (): void => {
    const ratio = count === 0 ? 1 : Math.min(1, VISIBLE_COVERS / count)
    element.style.setProperty(
      '--thumb-width',
      `${Math.max(MIN_THUMB, Math.round(width * ratio))}px`,
    )
  }
  new ResizeObserver((entries) => {
    const entry = entries.at(-1)
    if (entry === undefined) return
    width = entry.contentRect.width
    sizeThumb()
  }).observe(input)
  input.addEventListener('input', () => seek(Number(input.value)))
  // Unavailable steps keep focus (aria-disabled), so presses are ignored here instead.
  previous.addEventListener('click', () => {
    if (!isUnavailable(previous)) step(-1)
  })
  next.addEventListener('click', () => {
    if (!isUnavailable(next)) step(1)
  })

  return {
    element,
    input,
    render(position, nextCount): void {
      const index = Math.round(position)
      const key = `${index}:${nextCount}`
      if (key === rendered) return
      rendered = key
      if (nextCount !== count) {
        count = nextCount
        input.max = String(Math.max(0, count - 1))
        sizeThumb()
      }
      if (document.activeElement !== input || input.value !== String(index))
        input.value = String(index)
      input.disabled = count < 2
      input.setAttribute(
        'aria-valuetext',
        count === 0 ? t('noBookmarks') : t('positionValue', String(index + 1), String(count)),
      )
      setUnavailable(previous, index <= 0)
      setUnavailable(next, index >= count - 1)
    },
    onSeek(listener): void {
      seek = listener
    },
    onStep(listener): void {
      step = listener
    },
  }
}
