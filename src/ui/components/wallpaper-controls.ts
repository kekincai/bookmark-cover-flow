import type { WallpaperAdjustment, WallpaperSettings } from '../../domain/wallpaper'
import { localizeError, t } from '../../shared/i18n'

export type WallpaperAction =
  | { readonly type: 'upload'; readonly file: File }
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

export function createWallpaperControls(): WallpaperControls {
  const element = document.createElement('section')
  element.className = 'wallpaper-controls settings-pane'
  element.innerHTML = `
    <header class="settings-pane-header"><h3>${t('background')}</h3><p>${t('backgroundDescription')}</p></header>
    <section class="settings-group">
      <h4>${t('wallpaperSource')}</h4>
      <label class="settings-action wallpaper-upload" data-liquid-item>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m-4 4 4-4 4 4M5 15v5h14v-5"/></svg>
        <span><strong>${t('chooseMedia')}</strong><small>${t('mediaHint')}</small></span>
        <input type="file" accept="image/*,video/*,.mov,.m4v" aria-label="${t('chooseMedia')}" />
      </label>
      <p class="wallpaper-current"></p>
      <div class="wallpaper-actions"><button class="settings-action wallpaper-play" type="button" data-liquid-item hidden>${t('pauseVideo')}</button><button class="settings-action wallpaper-reset" type="button" data-liquid-item><b aria-hidden="true">↻</b><span>${t('restoreBackground')}</span></button></div>
      <p class="wallpaper-status" role="status" aria-live="polite"></p>
      <p class="wallpaper-error" role="alert" hidden></p>
    </section>
    <section class="settings-group wallpaper-adjustments"><h4>${t('adjustments')}</h4></section>
    <details class="wallpaper-hdr-note"><summary>${t('mediaDetails')}</summary><p>${t('mediaLimit')}</p><p>${t('nativeVideoNote')}</p><p class="wallpaper-display"></p><p>${t('codecNote')}</p></details>`
  let action: (action: WallpaperAction) => void = () => undefined
  const input = element.querySelector<HTMLInputElement>('input[type="file"]')!
  const reset = element.querySelector<HTMLButtonElement>('.wallpaper-reset')!
  const play = element.querySelector<HTMLButtonElement>('.wallpaper-play')!
  const status = element.querySelector<HTMLElement>('.wallpaper-status')!
  const error = element.querySelector<HTMLElement>('.wallpaper-error')!
  const current = element.querySelector<HTMLElement>('.wallpaper-current')!
  const ranges = (['blur', 'dim'] as const).map((name) => {
    const label = document.createElement('label')
    label.className = 'range-row'
    const title = t(name === 'blur' ? 'photoBlur' : 'dimming')
    const unit = name === 'blur' ? 'px' : '%'
    label.innerHTML = `<span>${title}<output>0${unit}</output></span><liquid-range><span class="liquid-range-track" aria-hidden="true"><span class="liquid-range-fill"></span></span><span class="liquid-range-thumb" aria-hidden="true"></span><input type="range" min="0" max="${name === 'blur' ? 10 : 80}" value="0" step="1" aria-label="${title}"></liquid-range>`
    const range = label.querySelector<HTMLInputElement>('input')!
    range.addEventListener('input', () => {
      label.querySelector('output')!.textContent = `${range.value}${unit}`
      action({ type: 'preview', patch: { [name]: Number(range.value) } })
    })
    range.addEventListener('change', () =>
      action({ type: 'adjust', patch: { [name]: Number(range.value) } }),
    )
    element.querySelector('.wallpaper-adjustments')!.append(label)
    return { name, range, label, unit }
  })
  input.addEventListener('change', () => {
    const file = input.files?.[0]
    input.value = ''
    if (file) action({ type: 'upload', file })
  })
  reset.addEventListener('click', () => action({ type: 'reset' }))
  play.addEventListener('click', () => action({ type: 'play' }))
  const hdr = window.matchMedia('(dynamic-range: high)')
  const display = (): void => {
    element.querySelector('.wallpaper-display')!.textContent = hdr.matches
      ? t('hdrDisplay')
      : t('sdrDisplay')
  }
  hdr.addEventListener('change', display)
  display()
  return {
    element,
    render(state): void {
      input.disabled = reset.disabled = play.disabled = state.busy
      reset.disabled ||= state.settings.kind === 'gradient'
      element.setAttribute('aria-busy', String(state.busy))
      current.textContent =
        state.settings.kind === 'gradient'
          ? t('defaultBackground')
          : `${state.settings.name} · ${state.settings.width} × ${state.settings.height}`
      play.hidden = state.settings.kind !== 'video'
      play.textContent = t(
        state.settings.paused || state.playbackError ? 'playVideo' : 'pauseVideo',
      )
      status.textContent = state.busy
        ? t('savingMedia')
        : state.settings.kind === 'video'
          ? state.settings.paused
            ? t('videoPaused')
            : t('videoSelected')
          : ''
      error.textContent = localizeError(state.error || state.playbackError)
      error.hidden = !error.textContent
      ranges.forEach(({ name, range, label, unit }) => {
        range.disabled =
          state.busy ||
          state.settings.kind === 'gradient' ||
          (name === 'blur' && state.settings.kind === 'video')
        label.classList.toggle('is-disabled', range.disabled)
        if (range.value !== String(state.settings[name])) {
          range.value = String(state.settings[name])
          range.dispatchEvent(new Event('input'))
        }
        label.querySelector('output')!.textContent = `${range.value}${unit}`
      })
    },
    onAction(listener): void {
      action = listener
    },
    destroy(): void {
      hdr.removeEventListener('change', display)
    },
  }
}
