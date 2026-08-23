import { describe, expect, it } from 'vitest'
import manifest from '../public/manifest.json'

describe('extension manifest', () => {
  it('opens from the toolbar instead of replacing the New Tab page', () => {
    expect(manifest).not.toHaveProperty('chrome_url_overrides')
    expect(manifest.action.default_title).toContain('Bookmark Cover Flow')
    expect(manifest.background.service_worker).toBe('assets/background.js')
  })

  it('declares access needed for webpage previews', () => {
    expect(manifest.host_permissions).toEqual(['https://*/*', 'http://*/*'])
  })
})
