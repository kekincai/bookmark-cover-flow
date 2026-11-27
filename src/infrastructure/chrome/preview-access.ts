import { PREVIEW_ORIGINS } from '../../shared/preview-message'

/**
 * Website access for previews is an optional host permission: nothing is granted at install, the
 * user grants it from Settings, and turning previews off hands it back.
 */
export interface PreviewAccess {
  has(): Promise<boolean>
  /**
   * Shows Chrome's permission prompt. Call it synchronously from the input's event handler —
   * nothing may be awaited before it, or the user gesture is gone.
   */
  request(): Promise<boolean>
  release(): Promise<void>
  /** Fires when access is granted or revoked anywhere, including chrome://extensions. */
  onChange(listener: (granted: boolean) => void): () => void
}

const origins = [...PREVIEW_ORIGINS]

function permissionsApi(): typeof chrome.permissions | undefined {
  return typeof chrome !== 'undefined' && chrome.runtime?.id !== undefined
    ? chrome.permissions
    : undefined
}

export function createPreviewAccess(): PreviewAccess {
  const api = permissionsApi()
  // The dev server has no permission model; the preference alone decides there.
  if (api === undefined) {
    return {
      has: () => Promise.resolve(true),
      request: () => Promise.resolve(true),
      release: () => Promise.resolve(),
      onChange: () => () => undefined,
    }
  }
  const has = async (): Promise<boolean> => {
    try {
      return await api.contains({ origins })
    } catch {
      return false
    }
  }
  return {
    has,
    async request(): Promise<boolean> {
      try {
        return await api.request({ origins })
      } catch (error: unknown) {
        console.warn('Unable to request website access for previews.', error)
        return false
      }
    },
    async release(): Promise<void> {
      try {
        await api.remove({ origins })
      } catch (error: unknown) {
        console.warn('Unable to release website access.', error)
      }
    },
    onChange(listener): () => void {
      const notify = async (): Promise<void> => listener(await has())
      const onAdded = (): void => void notify()
      const onRemoved = (): void => void notify()
      api.onAdded.addListener(onAdded)
      api.onRemoved.addListener(onRemoved)
      return () => {
        api.onAdded.removeListener(onAdded)
        api.onRemoved.removeListener(onRemoved)
      }
    },
  }
}
