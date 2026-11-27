import type { WallpaperSettings } from '../../domain/wallpaper'

export interface PreparedWallpaper {
  readonly element: HTMLImageElement | HTMLVideoElement
  readonly width: number
  readonly height: number
  dispose(): void
}

const DECODE_TIMEOUT_MS = 20_000
// User-facing messages; `localizeError` maps these exact strings to the locale catalogs.
const DECODE_FAILED =
  'Chrome cannot decode this file. Try a supported image, MP4 or WebM video; HEVC/MOV support depends on your system.'
const DECODE_TIMEOUT = 'This file took too long to decode. Try a smaller or different file.'
const NO_FRAMES = 'The file has no decodable image or video frames.'
const AUTOPLAY_BLOCKED = 'Autoplay was blocked. Select Play video to retry.'
const PLAYBACK_FAILED = 'Video playback failed. Try another file or select Play video to retry.'
const PLAYBACK_STOPPED = 'This video could not continue playing. Choose another file.'

function abortReason(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new DOMException('Cancelled', 'AbortError')
}

/** Settles with `work`, or rejects with the signal's reason as soon as it aborts. */
async function untilAborted<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted()
  const listening = new AbortController()
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        signal.addEventListener('abort', () => reject(abortReason(signal)), {
          once: true,
          signal: listening.signal,
        })
      }),
    ])
  } finally {
    listening.abort()
  }
}

/** Resolves on the media's first loaded frame; every listener is dropped once it settles. */
function loadMedia(
  media: HTMLImageElement | HTMLVideoElement,
  url: string,
  signal: AbortSignal,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(abortReason(signal))
      return
    }
    const listening = new AbortController()
    const options = { once: true, signal: listening.signal }
    const settle = (finish: () => void): void => {
      listening.abort()
      finish()
    }
    media.addEventListener(
      media instanceof HTMLVideoElement ? 'loadeddata' : 'load',
      () => settle(resolve),
      options,
    )
    media.addEventListener('error', () => settle(() => reject(new Error(DECODE_FAILED))), options)
    signal.addEventListener('abort', () => settle(() => reject(abortReason(signal))), options)
    media.src = url
  })
}

/** Deadline and decoder failures become the user-facing messages; cancellation stays an AbortError. */
function preparationError(error: unknown): Error {
  if (error instanceof DOMException) {
    // AbortSignal.timeout() aborts with a TimeoutError, not an AbortError.
    if (error.name === 'TimeoutError') return new Error(DECODE_TIMEOUT)
    if (error.name === 'AbortError') return error
    if (error.name === 'EncodingError') return new Error(DECODE_FAILED)
  }
  return error instanceof Error ? error : new Error(DECODE_FAILED)
}

/** Decode before replacing the visible media; preserve original HDR bytes and color metadata. */
export async function prepareWallpaper(
  blob: Blob,
  kind: 'image' | 'video',
  signal: AbortSignal,
): Promise<PreparedWallpaper> {
  const url = URL.createObjectURL(blob)
  const media = kind === 'video' ? document.createElement('video') : document.createElement('img')
  media.className = 'wallpaper-surface__media'
  media.setAttribute('aria-hidden', 'true')
  if (media instanceof HTMLVideoElement) {
    media.muted = media.defaultMuted = true
    media.volume = 0
    media.autoplay = false
    media.loop = true
    media.playsInline = true
    media.preload = 'auto'
    media.disablePictureInPicture = true
    media.disableRemotePlayback = true
  } else {
    media.alt = ''
    media.draggable = false
    media.decoding = 'async'
  }
  const dispose = (): void => {
    if (media instanceof HTMLVideoElement) media.pause()
    media.removeAttribute('src')
    if (media instanceof HTMLVideoElement) media.load()
    media.remove()
    URL.revokeObjectURL(url)
  }
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(DECODE_TIMEOUT_MS)])
  try {
    await loadMedia(media, url, deadline)
    // Swap in only fully decoded pixels, so the first frame never paints half-decoded.
    if (media instanceof HTMLImageElement) await untilAborted(media.decode(), deadline)
    const width = media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth
    const height = media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight
    if (!width || !height) throw new Error(NO_FRAMES)
    return { element: media, width, height, dispose }
  } catch (error) {
    dispose()
    throw preparationError(error)
  }
}

/**
 * Stage background layer. Mounted as the first child of the Cover Flow stage, behind the covers.
 * A video plays only while it is wanted (not paused), on screen, not suspended (covered by the
 * full-screen dialog), in a visible tab and allowed to move (Reduce Motion).
 */
export function createWallpaperSurface(onPlayback: (error?: string) => void) {
  const element = document.createElement('div')
  element.className = 'wallpaper-surface'
  element.setAttribute('aria-hidden', 'true')
  const tint = document.createElement('div')
  tint.className = 'wallpaper-surface__tint'
  element.append(tint)
  const lifetime = new AbortController()
  let current: PreparedWallpaper | undefined
  let settings: WallpaperSettings | undefined
  let playbackGeneration = 0
  // Grid and List views hide the stage with display:none, which reports as not intersecting.
  let visible = false
  let suspended = false
  let motionAllowed = true

  const enforceSilence = (): void => {
    const video = current?.element
    if (video instanceof HTMLVideoElement) {
      if (!video.muted) video.muted = true
      if (video.volume !== 0) video.volume = 0
    }
  }
  const shouldPlay = (): boolean =>
    settings?.paused === false && visible && !suspended && !document.hidden && motionAllowed
  const play = async (video: HTMLVideoElement, generation: number): Promise<void> => {
    try {
      await video.play()
      if (generation === playbackGeneration) onPlayback()
    } catch (error) {
      if (generation !== playbackGeneration) return
      onPlayback(
        error instanceof Error && error.name === 'NotAllowedError'
          ? AUTOPLAY_BLOCKED
          : PLAYBACK_FAILED,
      )
    }
  }
  const syncPlayback = (): void => {
    const generation = ++playbackGeneration
    const video = current?.element
    if (!(video instanceof HTMLVideoElement)) return
    enforceSilence()
    if (!shouldPlay()) {
      video.pause()
      return
    }
    void play(video, generation)
  }
  const mediaError = (): void => onPlayback(PLAYBACK_STOPPED)
  const release = (): void => {
    playbackGeneration += 1
    current?.element.removeEventListener('volumechange', enforceSilence)
    current?.element.removeEventListener('error', mediaError)
    current?.dispose()
    current = undefined
  }
  const adjust = (next: WallpaperSettings): void => {
    const playbackChanged = settings?.paused !== next.paused
    settings = next
    element.dataset.kind = next.kind
    element.dataset.preset = next.preset
    // No filter (even blur(0)) on video or its ancestors: use the native HDR media pipeline.
    element.style.setProperty('--photo-blur', `${next.blur}px`)
    tint.style.opacity = next.kind === 'gradient' ? '0' : String(next.dim / 100)
    if (playbackChanged) syncPlayback()
  }
  const observer = new IntersectionObserver((entries) => {
    const entry = entries.at(-1)
    if (entry === undefined || entry.isIntersecting === visible) return
    visible = entry.isIntersecting
    syncPlayback()
  })
  observer.observe(element)
  document.addEventListener('visibilitychange', syncPlayback, { signal: lifetime.signal })
  return {
    element,
    setMedia(media: PreparedWallpaper | undefined, next: WallpaperSettings): void {
      release()
      current = media
      if (media) {
        element.prepend(media.element)
        media.element.addEventListener('volumechange', enforceSilence)
        media.element.addEventListener('error', mediaError)
      }
      adjust(next)
      syncPlayback()
    },
    adjust,
    retry: syncPlayback,
    /** Hold playback while something opaque (the full-screen dialog) covers the stage. */
    setSuspended(next: boolean): void {
      if (suspended === next) return
      suspended = next
      syncPlayback()
    },
    /** False while Reduce Motion is on and the user has not explicitly pressed Play. */
    setMotionAllowed(next: boolean): void {
      if (motionAllowed === next) return
      motionAllowed = next
      syncPlayback()
    },
    destroy(): void {
      lifetime.abort()
      observer.disconnect()
      release()
      element.remove()
    },
  }
}
