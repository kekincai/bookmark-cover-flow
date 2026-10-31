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

/** Owns the stage background: `mount` is the Cover Flow stage the surface fills. */
export function createWallpaperController(
  controls: WallpaperControls,
  mount: HTMLElement,
): {
  init(): Promise<void>
  destroy(): void
} {
  let state: WallpaperViewState = {
    settings: defaultWallpaper,
    busy: true,
    error: '',
    playbackError: '',
  }
  let saved: WallpaperSettings = defaultWallpaper
  let destroyed = false
  const lifetime = new AbortController()
  const publish = (): void => {
    if (!destroyed) controls.render(state)
  }
  const surface = createWallpaperSurface((error) => {
    state = { ...state, playbackError: error ?? '' }
    publish()
  })
  mount.prepend(surface.element)
  const failure = (error: unknown): void => {
    state = {
      ...state,
      settings: saved,
      error: error instanceof Error ? error.message : 'Unable to save the background.',
    }
    surface.adjust(saved)
  }

  const act = async (action: WallpaperAction): Promise<void> => {
    if (destroyed || state.busy) return
    if (action.type === 'preview') {
      state = { ...state, settings: { ...state.settings, ...action.patch } }
      surface.adjust(state.settings)
      return
    }
    state = { ...state, busy: true, error: '' }
    publish()
    let prepared: PreparedWallpaper | undefined
    try {
      if (action.type === 'upload') {
        const kind = wallpaperFileKind(action.file)
        prepared = await prepareWallpaper(action.file, kind, lifetime.signal)
        const next = {
          ...saved,
          kind,
          name: action.file.name,
          width: prepared.width,
          height: prepared.height,
          paused: kind === 'video' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        }
        await saveWallpaperMedia(action.file, next)
        if (destroyed) {
          prepared.dispose()
          return
        }
        saved = next
        state = { ...state, settings: saved, playbackError: '' }
        surface.setMedia(prepared, saved)
        prepared = undefined
      } else if (action.type === 'preset') {
        // A built-in background replaces any stored photo or video.
        await saveWallpaperPreset(action.preset)
        if (destroyed) return
        saved = { ...defaultWallpaper, preset: action.preset }
        state = { ...state, settings: saved, playbackError: '' }
        surface.setMedia(undefined, saved)
      } else if (action.type === 'reset') {
        await resetWallpaper()
        if (destroyed) return
        saved = defaultWallpaper
        state = { ...state, settings: saved, playbackError: '' }
        surface.setMedia(undefined, saved)
      } else {
        const patch =
          action.type === 'play'
            ? { paused: state.playbackError ? false : !saved.paused }
            : action.patch
        await saveWallpaperAdjustment(patch)
        if (destroyed) return
        saved = { ...saved, ...patch }
        state = { ...state, settings: saved, playbackError: '' }
        surface.adjust(saved)
        if (action.type === 'play') surface.retry()
      }
    } catch (error) {
      prepared?.dispose()
      if (!destroyed) failure(error)
    } finally {
      state = { ...state, busy: false }
      publish()
    }
  }
  controls.onAction((action) => {
    void act(action)
  })
  publish()
  return {
    async init(): Promise<void> {
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
      } finally {
        state = { ...state, busy: false }
        publish()
      }
    },
    destroy(): void {
      destroyed = true
      lifetime.abort()
      surface.destroy()
    },
  }
}
