import { isPreviewRequest } from '../shared/preview-message'
import { resolvePreview, sweepPreviewCache } from './preview-cache'

const SWEEP_ALARM = 'sweep-preview-cache'
const SWEEP_PERIOD_MINUTES = 24 * 60

async function sweep(): Promise<void> {
  try {
    await sweepPreviewCache()
  } catch (error: unknown) {
    console.warn('Unable to sweep the preview cache.', error)
  }
}

async function openApp(): Promise<void> {
  try {
    await chrome.tabs.create({ url: chrome.runtime.getURL('index.html') })
  } catch (error: unknown) {
    console.error('Unable to open Bookmark Cover Flow.', error)
  }
}

async function scheduleSweep(): Promise<void> {
  try {
    await chrome.alarms.create(SWEEP_ALARM, { periodInMinutes: SWEEP_PERIOD_MINUTES })
  } catch (error: unknown) {
    console.warn('Unable to schedule the preview cache sweep.', error)
  }
  await sweep()
}

// Listeners are registered synchronously at top level so Chrome can wake the worker for them.
chrome.action.onClicked.addListener(() => void openApp())
chrome.runtime.onInstalled.addListener(() => void scheduleSweep())
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SWEEP_ALARM) void sweep()
})

/** Only this extension's own pages may ask the worker to fetch anything. */
function isOwnPage(sender: chrome.runtime.MessageSender): boolean {
  if (sender.id !== chrome.runtime.id || sender.url === undefined) return false
  try {
    return new URL(sender.url).origin === new URL(chrome.runtime.getURL('')).origin
  } catch {
    return false
  }
}

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (!isOwnPage(sender) || !isPreviewRequest(message)) return
  void (async () => {
    try {
      sendResponse(await resolvePreview(message.url, message.priority))
    } catch (error: unknown) {
      console.error('Preview resolution failed.', error)
      sendResponse({ source: 'none' })
    }
  })()
  return true
})
