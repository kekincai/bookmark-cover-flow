import { describe, expect, it } from 'vitest'
import manifest from '../public/manifest.json'

describe('extension manifest', () => {
  it('opens from the toolbar instead of replacing the New Tab page', () => {
    expect(manifest).not.toHaveProperty('chrome_url_overrides')
    expect(manifest.action.default_title).toContain('Bookmark Cover Flow')
    expect(manifest.background.service_worker).toBe('assets/background.js')
    expect(manifest.version).toBe('1.0.0')
    expect(manifest.icons['128']).toBe('icons/icon-128.png')
  })

  it('declares access needed for webpage previews', () => {
    expect(manifest.host_permissions).toEqual(['https://*/*', 'http://*/*'])
    expect(manifest.content_security_policy.extension_pages).toContain("script-src 'self'")
  })
})
