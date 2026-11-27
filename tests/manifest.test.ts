import { describe, expect, it } from 'vitest'
import manifest from '../public/manifest.json'
import { PREVIEW_ORIGINS } from '../src/shared/preview-message'

describe('extension manifest', () => {
  it('opens from the toolbar instead of replacing the New Tab page', () => {
    expect(manifest).not.toHaveProperty('chrome_url_overrides')
    expect(manifest.action.default_title).toBe('__MSG_openExtension__')
    expect(manifest.default_locale).toBe('en')
    expect(manifest.background.service_worker).toBe('assets/background.js')
    expect(manifest.version).toBe('1.3.0')
    expect(manifest.icons['128']).toBe('icons/icon-128.png')
  })

  it('asks for website access only when previews are turned on', () => {
    expect(manifest).not.toHaveProperty('host_permissions')
    expect(manifest.optional_host_permissions).toEqual(PREVIEW_ORIGINS)
    expect(manifest.permissions).toEqual(['bookmarks', 'storage', 'favicon', 'alarms'])
  })

  it('targets the Chrome version whose platform features the UI relies on', () => {
    // <dialog closedby> 134, Invoker Commands and appearance: base-select 135.
    expect(manifest.minimum_chrome_version).toBe('135')
  })

  it('locks extension pages down with a strict CSP and Trusted Types', () => {
    const csp = manifest.content_security_policy.extension_pages
    for (const directive of [
      "default-src 'self'",
      "script-src 'self'",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'none'",
      "media-src 'self' blob:",
      "img-src 'self' https: data: blob:",
      "require-trusted-types-for 'script'",
      'trusted-types static-markup',
    ])
      expect(csp).toContain(directive)
    expect(csp).not.toMatch(/img-src[^;]*\bhttp:/)
  })
})
