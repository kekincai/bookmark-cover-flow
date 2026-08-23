import { isPreviewRequest } from '../shared/preview-message'
import { resolvePreview } from './preview-cache'

chrome.action.onClicked.addListener(() => {
  void chrome.tabs.create({ url: chrome.runtime.getURL('index.html') })
})

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  void _sender
  if (!isPreviewRequest(message)) return

  void resolvePreview(message.url)
    .then(sendResponse)
    .catch((error: unknown) => {
      console.error('Preview resolution failed.', error)
      sendResponse({ source: 'none' })
    })
  return true
})
