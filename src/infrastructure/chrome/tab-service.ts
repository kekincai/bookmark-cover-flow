import type { TabService } from '../../application/open-bookmark'

export function createTabService(): TabService {
  return {
    async open(url, options = {}): Promise<void> {
      if (typeof chrome !== 'undefined' && chrome.tabs?.create !== undefined) {
        await chrome.tabs.create({ url, active: options.background !== true })
        return
      }
      window.open(url, '_blank', 'noopener,noreferrer')
    },
  }
}
