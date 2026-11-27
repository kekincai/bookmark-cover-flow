import { defaultWallpaper, wallpaperFileKind, type WallpaperSettings } from '../../domain/wallpaper'
import {
  readWallpaper,
  resetWallpaper,
  saveWallpaperAdjustment,
  saveWallpaperMedia,
  saveWallpaperPreset,
} from '../../infrastructure/wallpaper-store'
import type {
  WallpaperAction,
  WallpaperControls,
  WallpaperViewState,
} from '../components/wallpaper-controls'
import {
  createWallpaperSurface,
  prepareWallpaper,
  type PreparedWallpaper,
} from '../components/wallpaper-surface'

export interface WallpaperController {
  init(): Promise<void>
  /** Pause a background video while the full-screen dialog covers the stage; resume when false. */
  setSuspended(suspended: boolean): void
  destroy(): void
}

/** Owns the stage background: `mount` is the Cover Flow stage the surface fills. */
export function createWallpaperController(
  controls: WallpaperControls,
  mount: HTMLElement,
): WallpaperController {
  let state: WallpaperViewState = {
    settings: defaultWallpaper,
    busy: true,
    error: '',
    playbackError: '',
  }
  let saved: WallpaperSettings = defaultWallpaper
  let destroyed = false
  const lifetime = new AbortController()
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  // An explicit Play overrides Reduce Motion until the user pauses or picks another background.
  let playRequested = false
  const motionHeld = (): boolean => reducedMotion.matches && !playRequested
  const publish = (): void => {
    if (destroyed) return
    const { settings } = state
    // A video held by Reduce Motion reads as paused, so the button offers Play.
    controls.render(
      settings.kind === 'video' && !settings.paused && motionHeld()
        ? { ...state, settings: { ...settings, paused: true } }
        : state,
    )
  }
  const surface = createWallpaperSurface((error) => {
    state = { ...state, playbackError: error ?? '' }
    publish()
  })
  const syncMotion = (): void => surface.setMotionAllowed(!motionHeld())
  syncMotion()
  reducedMotion.addEventListener(
    'change',
    () => {
      syncMotion()
      publish()
    },
    { signal: lifetime.signal },
  )
  mount.prepend(surface.element)
  const failure = (error: unknown): void => {
    state = {
      ...state,
      settings: saved,
      error: error instanceof Error ? error.message : 'Unable to save the background.',
    }
    surface.adjust(saved)
  }
  const replaceMedia = (media: PreparedWallpaper | undefined): void => {
    playRequested = false
    syncMotion()
    state = { ...state, settings: saved, playbackError: '' }
    surface.setMedia(media, saved)
  }

  const apply = async (action: Exclude<WallpaperAction, { type: 'preview' }>): Promise<void> => {
    let prepared: PreparedWallpaper | undefined
    try {
      if (action.type === 'upload') {
        const kind = wallpaperFileKind(action.file)
        prepared = await prepareWallpaper(action.file, kind, lifetime.signal)
        // Reduce Motion is applied on every start, not stored, so it follows the system setting.
        const next = {
          ...saved,
          kind,
          name: action.file.name,
          width: prepared.width,
          height: prepared.height,
          paused: false,
        }
        await saveWallpaperMedia(action.file, next)
        if (destroyed) return
        saved = next
        replaceMedia(prepared)
        prepared = undefined
      } else if (action.type === 'preset') {
        // A built-in background replaces any stored photo or video.
        await saveWallpaperPreset(action.preset)
        if (destroyed) return
        saved = { ...defaultWallpaper, preset: action.preset }
        replaceMedia(undefined)
      } else if (action.type === 'reset') {
        await resetWallpaper()
        if (destroyed) return
        saved = defaultWallpaper
        replaceMedia(undefined)
      } else {
        // Play when the button offers Play: paused, held by Reduce Motion, or after an error.
        const resume = Boolean(state.playbackError) || saved.paused || motionHeld()
        const patch = action.type === 'play' ? { paused: !resume } : action.patch
        await saveWallpaperAdjustment(patch)
        if (destroyed) return
        saved = { ...saved, ...patch }
        state = { ...state, settings: saved, playbackError: '' }
        if (action.type === 'play') {
          playRequested = resume
          syncMotion()
        }
        surface.adjust(saved)
        if (action.type === 'play') surface.retry()
      }
    } catch (error) {
      if (!destroyed) failure(error)
    } finally {
      prepared?.dispose()
    }
  }

  /** Never rejects: `apply` reports its own failures, and a render failure is only logged. */
  const act = async (action: WallpaperAction): Promise<void> => {
    if (destroyed || state.busy) return
    try {
      if (action.type === 'preview') {
        state = { ...state, settings: { ...state.settings, ...action.patch } }
        surface.adjust(state.settings)
        return
      }
      state = { ...state, busy: true, error: '' }
      try {
        publish()
        await apply(action)
      } finally {
        state = { ...state, busy: false }
        publish()
      }
    } catch (error) {
      console.error('Unable to update the stage background.', error)
    }
  }
  controls.onAction((action) => {
    void act(action)
  })
  publish()

  const load = async (): Promise<void> => {
    try {
      const snapshot = await readWallpaper()
      if (destroyed) return
      saved = snapshot.settings
      state = { ...state, settings: saved }
      if (saved.kind === 'gradient') surface.setMedia(undefined, saved)
      else {
        if (!snapshot.blob)
          throw new Error(
            'The saved background file is missing. Choose another file or restore the default.',
          )
        const prepared = await prepareWallpaper(snapshot.blob, saved.kind, lifetime.signal)
        if (destroyed) {
          prepared.dispose()
          return
        }
        surface.setMedia(prepared, saved)
      }
    } catch (error) {
      if (!destroyed) failure(error)
    }
  }

  return {
    async init(): Promise<void> {
      try {
        await load()
      } finally {
        state = { ...state, busy: false }
        publish()
      }
    },
    setSuspended(suspended: boolean): void {
      if (!destroyed) surface.setSuspended(suspended)
    },
    destroy(): void {
      destroyed = true
      lifetime.abort()
      surface.destroy()
    },
  }
}
