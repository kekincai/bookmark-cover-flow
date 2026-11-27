import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolvePreview, sweepPreviewCache } from '../../src/background/preview-cache'

const store = new Map<string, unknown>()
const local = {
  get: vi.fn((key: string | null) =>
    Promise.resolve(
      key === null ? Object.fromEntries(store) : store.has(key) ? { [key]: store.get(key) } : {},
    ),
  ),
  set: vi.fn((items: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(items)) store.set(key, value)
    return Promise.resolve()
  }),
  remove: vi.fn((keys: string[]) => {
    keys.forEach((key) => store.delete(key))
    return Promise.resolve()
  }),
}

const page = (body: string, url: string, contentType = 'text/html; charset=utf-8'): Response => {
  const response = new Response(body, { headers: { 'content-type': contentType } })
  Object.defineProperty(response, 'url', { value: url })
  return response
}

beforeEach(() => {
  store.clear()
  vi.stubGlobal('chrome', { storage: { local } })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('resolvePreview', () => {
  it('reads the preview from <head> without cookies or a referrer', async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        page(
          '<html><head><meta property="og:image" content="http://cdn.example.com/a.png"></head><body>…',
          'https://example.com/',
        ),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const result = await resolvePreview('https://example.com/', 'high')
    // Plain-http images are upgraded: extension pages only load https images.
    expect(result).toEqual({ imageUrl: 'https://cdn.example.com/a.png', source: 'network' })
    const init = fetchMock.mock.calls[0]?.[1]
    expect(init).toMatchObject({
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      priority: 'high',
    })
  })

  it('never fetches private-network URLs', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await resolvePreview('http://192.168.1.1/')).toEqual({ source: 'none' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('drops a public page that redirected into a private network', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          page('<meta property="og:image" content="/x.png">', 'http://10.0.0.8/admin'),
        ),
      ),
    )
    expect(await resolvePreview('https://redirector.example/')).toEqual({ source: 'none' })
  })

  it('treats a cache entry for a different URL (hash collision) as a miss', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          page(
            '<meta property="og:image" content="https://a.example/1.png">',
            'https://a.example/',
          ),
        ),
      ),
    )
    await resolvePreview('https://a.example/')
    const [key] = [...store.keys()]
    store.set(key!, { ...(store.get(key!) as object), url: 'https://other.example/' })
    const fetchMock = vi.fn(() => Promise.resolve(page('<head></head>', 'https://a.example/')))
    vi.stubGlobal('fetch', fetchMock)
    await resolvePreview('https://a.example/')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('sweepPreviewCache', () => {
  it('deletes expired and malformed entries and leaves other data alone', async () => {
    const now = Date.now()
    store.set('preview-fresh', { url: 'https://a/', imageUrl: 'https://a/i.png', resolvedAt: now })
    store.set('preview-old', {
      url: 'https://b/',
      imageUrl: 'https://b/i.png',
      resolvedAt: now - 8 * 24 * 3600_000,
    })
    store.set('preview-failed-old', { url: 'https://c/', resolvedAt: now - 13 * 3600_000 })
    store.set('preview-legacy', { resolvedAt: now })
    store.set('bookmark-cover-flow-preferences', { theme: 'dark' })
    await sweepPreviewCache()
    expect([...store.keys()].sort()).toEqual(['bookmark-cover-flow-preferences', 'preview-fresh'])
  })
})
