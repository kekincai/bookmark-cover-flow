import { describe, expect, it } from 'vitest'
import { isPreviewableUrl, isPreviewRequest } from '../../src/shared/preview-message'

describe('isPreviewableUrl', () => {
  it('accepts public http(s) pages', () => {
    expect(isPreviewableUrl('https://developer.chrome.com/docs')).toBe(true)
    expect(isPreviewableUrl('http://example.org/page?x=1')).toBe(true)
  })

  it('never lets the background contact local or private-network hosts', () => {
    for (const url of [
      'http://localhost:8080/',
      'http://app.localhost/',
      'http://127.0.0.1/',
      'http://10.0.0.5/',
      'http://172.16.4.2/',
      'http://172.31.255.255/',
      'http://192.168.1.1/',
      'http://169.254.169.254/latest/meta-data/',
      'http://100.64.0.1/',
      'http://0.0.0.0/',
      'http://[::1]/',
      'http://[fd12:3456::1]/',
      'http://[fe80::1]/',
      'http://[::ffff:192.168.0.1]/',
      'http://printer.local/',
      'https://wiki.internal/',
      'http://router.home.arpa/',
      'http://intranet/',
    ])
      expect(isPreviewableUrl(url), url).toBe(false)
  })

  it('keeps public addresses that merely look similar', () => {
    expect(isPreviewableUrl('http://172.32.0.1/')).toBe(true)
    expect(isPreviewableUrl('https://localhost.example.com/')).toBe(true)
  })

  it('rejects other schemes, credentials and oversized URLs', () => {
    expect(isPreviewableUrl('javascript:alert(1)')).toBe(false)
    expect(isPreviewableUrl('file:///etc/passwd')).toBe(false)
    expect(isPreviewableUrl('chrome://settings')).toBe(false)
    expect(isPreviewableUrl('https://user:secret@example.com/')).toBe(false)
    expect(isPreviewableUrl(`https://example.com/${'a'.repeat(3000)}`)).toBe(false)
    expect(isPreviewableUrl('not a url')).toBe(false)
  })
})

describe('isPreviewRequest', () => {
  it('validates the message shape and the optional priority', () => {
    expect(isPreviewRequest({ type: 'resolve-preview', url: 'https://a.example/' })).toBe(true)
    expect(
      isPreviewRequest({ type: 'resolve-preview', url: 'https://a.example/', priority: 'high' }),
    ).toBe(true)
    expect(
      isPreviewRequest({ type: 'resolve-preview', url: 'https://a.example/', priority: 'urgent' }),
    ).toBe(false)
    expect(isPreviewRequest({ type: 'resolve-preview', url: 42 })).toBe(false)
    expect(isPreviewRequest(null)).toBe(false)
  })
})
