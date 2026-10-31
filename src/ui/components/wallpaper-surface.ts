import type { WallpaperSettings } from '../../domain/wallpaper'

export interface PreparedWallpaper {
  readonly element: HTMLImageElement | HTMLVideoElement
  readonly width: number
  readonly height: number
  dispose(): void
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
  }
  const dispose = (): void => {
    if (media instanceof HTMLVideoElement) media.pause()
    media.removeAttribute('src')
    if (media instanceof HTMLVideoElement) media.load()
    media.remove()
    URL.revokeObjectURL(url)
  }
  try {
    await new Promise<void>((resolve, reject) => {
      const successEvent = kind === 'video' ? 'loadeddata' : 'load'
      const cleanup = (): void => {
        window.clearTimeout(timer)
        media.removeEventListener(successEvent, success)
        media.removeEventListener('error', failure)
        signal.removeEventListener('abort', abort)
      }
      const success = (): void => {
        cleanup()
        resolve()
      }
      const failure = (): void => {
        cleanup()
        reject(
          new Error(
            'Chrome cannot decode this file. Try a supported image, MP4 or WebM video; HEVC/MOV support depends on your system.',
          ),
        )
      }
      const abort = (): void => {
        cleanup()
        reject(new DOMException('Cancelled', 'AbortError'))
      }
      const timer = window.setTimeout(() => {
        cleanup()
        reject(new Error('This file took too long to decode. Try a smaller or different file.'))
      }, 20000)
      media.addEventListener(successEvent, success, { once: true })
      media.addEventListener('error', failure, { once: true })
      signal.addEventListener('abort', abort, { once: true })
      if (signal.aborted) {
        abort()
        return
      }
      media.src = url
    })
    const width = media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth
    const height = media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight
    if (!width || !height) throw new Error('The file has no decodable image or video frames.')
    return { element: media, width, height, dispose }
  } catch (error) {
    dispose()
    throw error
  }
}

/** Stage background layer. Mounted as the first child of the Cover Flow stage, behind the covers. */
export function createWallpaperSurface(onPlayback: (error?: string) => void) {
  const element = document.createElement('div')
  element.className = 'wallpaper-surface'
  element.setAttribute('aria-hidden', 'true')
  const tint = document.createElement('div')
  tint.className = 'wallpaper-surface__tint'
  element.append(tint)
  let current: PreparedWallpaper | undefined
  let settings: WallpaperSettings | undefined
  let playbackGeneration = 0

  const enforceSilence = (): void => {
    const video = current?.element
    if (video instanceof HTMLVideoElement) {
      if (!video.muted) video.muted = true
      if (video.volume !== 0) video.volume = 0
    }
  }
  const syncPlayback = (): void => {
    const generation = ++playbackGeneration
    const video = current?.element
    if (!(video instanceof HTMLVideoElement)) return
    enforceSilence()
    if (document.hidden || settings?.paused) {
      video.pause()
      return
    }
    void video
      .play()
      .then(() => {
        if (generation === playbackGeneration) onPlayback()
      })
      .catch((error: unknown) => {
        if (generation !== playbackGeneration) return
        onPlayback(
          error instanceof Error && error.name === 'NotAllowedError'
            ? 'Autoplay was blocked. Select Play video to retry.'
            : 'Video playback failed. Try another file or select Play video to retry.',
        )
      })
  }
  const mediaError = (): void =>
    onPlayback('This video could not continue playing. Choose another file.')
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
  document.addEventListener('visibilitychange', syncPlayback)
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
    destroy(): void {
      document.removeEventListener('visibilitychange', syncPlayback)
      release()
      element.remove()
    },
  }
}
