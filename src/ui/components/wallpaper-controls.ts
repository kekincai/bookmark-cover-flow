import {
  MAX_WALLPAPER_BLUR,
  MAX_WALLPAPER_DIM,
  type WallpaperAdjustment,
  type WallpaperPreset,
  type WallpaperSettings,
} from '../../domain/wallpaper'
import { localizeError, t } from '../../shared/i18n'
import { icons } from './icons'

export type WallpaperAction =
  | { readonly type: 'upload'; readonly file: File }
  | { readonly type: 'preset'; readonly preset: WallpaperPreset }
  | { readonly type: 'reset' }
  | { readonly type: 'play' }
  | { readonly type: 'preview'; readonly patch: Partial<WallpaperAdjustment> }
  | { readonly type: 'adjust'; readonly patch: Partial<WallpaperAdjustment> }
export interface WallpaperViewState {
  readonly settings: WallpaperSettings
  readonly busy: boolean
  readonly error: string
  readonly playbackError: string
}
export interface WallpaperControls {
  readonly element: HTMLElement
  render(state: WallpaperViewState): void
  onAction(listener: (action: WallpaperAction) => void): void
  destroy(): void
}

/* ---------- Settings building blocks, shared with the preferences menu ---------- */

let sequence = 0
export function settingsId(name: string): string {
  sequence += 1
  return `settings-${name}-${sequence}`
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text) node.textContent = text
  return node
}

export function settingsHeading(text: string): HTMLHeadingElement {
  const heading = createElement('h3', 'settings-heading', text)
  heading.id = settingsId('heading')
  return heading
}

export function settingsGroup(...children: readonly HTMLElement[]): HTMLDivElement {
  const group = createElement('div', 'settings-group')
  group.append(...children)
  return group
}

export interface SettingsRow {
  readonly row: HTMLDivElement
  readonly title: HTMLElement
  readonly sub: HTMLElement | undefined
}

/**
 * A 44 px row: title (and optional secondary text) on the left, controls on the right.
 * `labelFor` associates the title as the control's <label>; `describe` points buttons at the
 * row text so a generic "Clear" still announces what it clears.
 */
export function settingsRow(
  title: string,
  controls: readonly HTMLElement[],
  options: {
    readonly sub?: string
    readonly labelFor?: HTMLElement
    readonly describe?: readonly HTMLElement[]
  } = {},
): SettingsRow {
  const row = createElement('div', 'settings-row')
  const text = createElement('div', 'settings-row__text')
  const titleElement = options.labelFor
    ? createElement('label', 'settings-row__title', title)
    : createElement('span', 'settings-row__title', title)
  titleElement.id = settingsId('title')
  if (titleElement instanceof HTMLLabelElement && options.labelFor)
    titleElement.htmlFor = options.labelFor.id
  text.append(titleElement)
  let sub: HTMLElement | undefined
  if (options.sub !== undefined) {
    sub = createElement('span', 'settings-row__sub', options.sub)
    sub.id = settingsId('sub')
    text.append(sub)
    options.labelFor?.setAttribute('aria-describedby', sub.id)
  }
  options.describe?.forEach((node) =>
    node.setAttribute('aria-describedby', [titleElement.id, sub?.id].filter(Boolean).join(' ')),
  )
  row.append(text, ...controls)
  return { row, title: titleElement, sub }
}

export function createSwitch(name: string): HTMLInputElement {
  const input = createElement('input', 'settings-switch')
  input.type = 'checkbox'
  input.id = settingsId(name)
  input.setAttribute('role', 'switch')
  return input
}

export function createSelect<T extends string>(
  name: string,
  choices: readonly { readonly value: T; readonly label: string }[],
): { readonly wrapper: HTMLSpanElement; readonly select: HTMLSelectElement } {
  const wrapper = createElement('span', 'settings-select')
  const select = createElement('select', 'settings-select__control')
  select.id = settingsId(name)
  choices.forEach((choice) => select.add(new Option(choice.label, choice.value)))
  wrapper.append(select)
  wrapper.insertAdjacentHTML('beforeend', icons.chevronDown)
  return { wrapper, select }
}

export function createRange(
  name: string,
  min: number,
  max: number,
): { readonly input: HTMLInputElement; readonly value: HTMLSpanElement } {
  const input = createElement('input', 'settings-range')
  input.type = 'range'
  input.id = settingsId(name)
  input.min = String(min)
  input.max = String(max)
  input.step = '1'
  const value = createElement('span', 'settings-range__value')
  value.setAttribute('aria-hidden', 'true')
  return { input, value }
}

export function createButton(label: string): HTMLButtonElement {
  const button = createElement('button', 'settings-button', label)
  button.type = 'button'
  return button
}

/** aria-disabled keeps focus on the control while an operation runs; clicks are ignored. */
export function setUnavailable(button: HTMLButtonElement, unavailable: boolean): void {
  if (unavailable) button.setAttribute('aria-disabled', 'true')
  else button.removeAttribute('aria-disabled')
}

export interface TileChoice<T extends string> {
  readonly value: T
  readonly label: string
  readonly thumbClass: string
  readonly thumbHtml?: string
}

/** Thumbnail radio group. Arrow keys move focus and select (unless `onPick` ignores 'arrow'). */
export function createTileGroup<T extends string>(
  labelledBy: string,
  choices: readonly TileChoice<T>[],
  onPick: (value: T, source: 'click' | 'arrow') => void,
): { readonly element: HTMLDivElement; setChecked(value: T): void } {
  const element = createElement('div', 'settings-tiles')
  element.setAttribute('role', 'radiogroup')
  element.setAttribute('aria-labelledby', labelledBy)
  const tiles = choices.map((choice) => {
    const tile = createElement('button', 'settings-tile')
    tile.type = 'button'
    tile.dataset.value = choice.value
    tile.setAttribute('role', 'radio')
    tile.setAttribute('aria-checked', 'false')
    tile.tabIndex = -1
    const thumb = createElement('span', `settings-tile__thumb ${choice.thumbClass}`)
    thumb.setAttribute('aria-hidden', 'true')
    if (choice.thumbHtml) thumb.innerHTML = choice.thumbHtml
    tile.append(thumb, createElement('span', 'settings-tile__label', choice.label))
    tile.addEventListener('click', () => onPick(choice.value, 'click'))
    element.append(tile)
    return tile
  })
  if (tiles[0]) tiles[0].tabIndex = 0
  element.addEventListener('keydown', (event) => {
    const index = tiles.indexOf(document.activeElement as HTMLButtonElement)
    if (index < 0) return
    const delta =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0
    if (!delta) return
    event.preventDefault()
    const nextIndex = (index + delta + tiles.length) % tiles.length
    const next = tiles[nextIndex]
    const choice = choices[nextIndex]
    if (!next || !choice) return
    tiles.forEach((tile) => (tile.tabIndex = tile === next ? 0 : -1))
    next.focus()
    onPick(choice.value, 'arrow')
  })
  return {
    element,
    setChecked(value): void {
      const focused = tiles.find((tile) => tile === document.activeElement)
      tiles.forEach((tile) => {
        const checked = tile.dataset.value === value
        tile.setAttribute('aria-checked', String(checked))
        // Keep the roving tab stop on a focused tile until focus leaves the group.
        tile.tabIndex = (focused ? tile === focused : checked) ? 0 : -1
      })
    },
  }
}

/* ---------- Stage background pane ---------- */

const MEDIA_ACCEPT = 'image/*,video/*,.mov,.m4v'

function isPristine(settings: WallpaperSettings): boolean {
  return (
    settings.kind === 'gradient' &&
    settings.preset === 'default' &&
    settings.blur === 0 &&
    settings.dim === 0
  )
}

export function createWallpaperControls(): WallpaperControls {
  const element = createElement('section', 'wallpaper-controls settings-pane')
  let action: (action: WallpaperAction) => void = () => undefined
  let state: WallpaperViewState | undefined
  const busy = (): boolean => state?.busy ?? true

  const input = createElement('input', 'wallpaper-file')
  input.type = 'file'
  input.accept = MEDIA_ACCEPT
  input.hidden = true
  input.setAttribute('aria-label', t('chooseMedia'))
  const pickFile = (): void => {
    if (!busy() && !input.disabled) input.click()
  }

  // Presets: built-in gradients plus the photo-or-video tile.
  const heading = settingsHeading(t('stageBackground'))
  const presets = createTileGroup<WallpaperPreset | 'media'>(
    heading.id,
    [
      { value: 'default', label: t('presetDefault'), thumbClass: 'wallpaper-thumb--default' },
      { value: 'mist', label: t('presetMist'), thumbClass: 'wallpaper-thumb--mist' },
      { value: 'night', label: t('presetNight'), thumbClass: 'wallpaper-thumb--night' },
      {
        value: 'media',
        label: t('presetMedia'),
        thumbClass: 'wallpaper-thumb--media',
        thumbHtml: icons.plus,
      },
    ],
    (value, source) => {
      if (busy()) return
      if (value === 'media') {
        // Arrowing onto the tile only moves focus; opening a file picker needs a deliberate press.
        if (source === 'click') pickFile()
        return
      }
      const settings = state?.settings
      if (settings?.kind === 'gradient' && settings.preset === value) return
      action({ type: 'preset', preset: value })
    },
  )
  const presetSection = createElement('div', 'settings-section')
  const presetGroup = settingsGroup(presets.element)
  presetGroup.classList.add('settings-group--tiles')
  presetSection.append(heading, presetGroup)

  // Drop zone and file status.
  const dropzone = createElement('div', 'wallpaper-dropzone')
  const choose = createButton(t('chooseFile'))
  dropzone.append(createElement('span', 'wallpaper-dropzone__text', t('dropMedia')), choose)
  const hint = createElement('p', 'settings-note', t('mediaHint'))
  const current = createElement('p', 'wallpaper-current')
  const status = createElement('p', 'wallpaper-status')
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  const error = createElement('p', 'wallpaper-error')
  error.setAttribute('role', 'alert')
  error.hidden = true
  const mediaGroup = settingsGroup(dropzone, input, hint, current, status, error)
  mediaGroup.classList.add('wallpaper-media')

  // Adjustments.
  const blur = createRange('blur', 0, MAX_WALLPAPER_BLUR)
  const dim = createRange('dim', 0, MAX_WALLPAPER_DIM)
  const ranges = [
    { name: 'blur' as const, ...blur },
    { name: 'dim' as const, ...dim },
  ]
  const blurRow = settingsRow(t('photoBlur'), [blur.input, blur.value], {
    sub: t('photoBlurHint'),
    labelFor: blur.input,
  })
  const dimRow = settingsRow(t('dimming'), [dim.input, dim.value], { labelFor: dim.input })
  const play = createButton(t('pauseVideo'))
  const playRow = settingsRow('', [play])
  playRow.row.hidden = true
  const restore = createButton(t('restore'))
  // The visible "Restore" is the start of the accessible name, so speech input still matches.
  restore.setAttribute('aria-label', t('restoreBackground'))
  const restoreRow = settingsRow(t('restoreBackground'), [restore])
  const adjustGroup = settingsGroup(blurRow.row, dimRow.row, playRow.row, restoreRow.row)

  element.append(presetSection, mediaGroup, adjustGroup)

  const formatValue = (name: 'blur' | 'dim', range: HTMLInputElement): string =>
    name === 'blur' ? (range.disabled ? '—' : `${range.value} px`) : `${range.value}%`

  ranges.forEach(({ name, input: range, value }) => {
    range.addEventListener('input', () => {
      value.textContent = formatValue(name, range)
      action({ type: 'preview', patch: { [name]: Number(range.value) } })
    })
    range.addEventListener('change', () =>
      action({ type: 'adjust', patch: { [name]: Number(range.value) } }),
    )
  })
  input.addEventListener('change', () => {
    const file = input.files?.[0]
    input.value = ''
    if (file) action({ type: 'upload', file })
  })
  choose.addEventListener('click', pickFile)
  play.addEventListener('click', () => {
    if (!busy()) action({ type: 'play' })
  })
  restore.addEventListener('click', () => {
    if (!busy() && !restore.hasAttribute('aria-disabled')) action({ type: 'reset' })
  })

  const hasFiles = (event: DragEvent): boolean =>
    event.dataTransfer?.types.includes('Files') ?? false
  const onDragOver = (event: DragEvent): void => {
    if (!hasFiles(event)) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = busy() ? 'none' : 'copy'
    dropzone.classList.add('is-dragging')
  }
  const onDragLeave = (event: DragEvent): void => {
    if (!dropzone.contains(event.relatedTarget as Node | null))
      dropzone.classList.remove('is-dragging')
  }
  const onDrop = (event: DragEvent): void => {
    if (!hasFiles(event)) return
    event.preventDefault()
    dropzone.classList.remove('is-dragging')
    const file = event.dataTransfer?.files[0]
    if (file && !busy()) action({ type: 'upload', file })
  }
  dropzone.addEventListener('dragenter', onDragOver)
  dropzone.addEventListener('dragover', onDragOver)
  dropzone.addEventListener('dragleave', onDragLeave)
  dropzone.addEventListener('drop', onDrop)

  return {
    element,
    render(next): void {
      state = next
      const { settings } = next
      const media = settings.kind !== 'gradient'
      element.setAttribute('aria-busy', String(next.busy))
      presets.setChecked(media ? 'media' : settings.preset)
      input.disabled = next.busy
      setUnavailable(choose, next.busy)
      dropzone.classList.toggle('is-busy', next.busy)

      current.textContent = media ? `${settings.name} · ${settings.width} × ${settings.height}` : ''
      current.hidden = !media
      status.textContent = next.busy
        ? t('savingMedia')
        : settings.kind === 'video'
          ? settings.paused
            ? t('videoPaused')
            : t('videoSelected')
          : ''
      error.textContent = localizeError(next.error || next.playbackError)
      error.hidden = !error.textContent

      playRow.row.hidden = settings.kind !== 'video'
      playRow.title.textContent = settings.name
      play.textContent = t(settings.paused || next.playbackError ? 'playVideo' : 'pauseVideo')
      setUnavailable(play, next.busy)
      setUnavailable(restore, next.busy || isPristine(settings))

      ranges.forEach(({ name, input: range, value }) => {
        range.disabled = name === 'blur' ? settings.kind !== 'image' : settings.kind === 'gradient'
        const stored = String(settings[name])
        if (range.value !== stored) range.value = stored
        value.textContent = formatValue(name, range)
        range.closest('.settings-row')?.classList.toggle('is-disabled', range.disabled)
      })
    },
    onAction(listener): void {
      action = listener
    },
    destroy(): void {
      dropzone.removeEventListener('dragenter', onDragOver)
      dropzone.removeEventListener('dragover', onDragOver)
      dropzone.removeEventListener('dragleave', onDragLeave)
      dropzone.removeEventListener('drop', onDrop)
    },
  }
}
