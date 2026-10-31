import { describe, expect, it } from 'vitest'
import { defaultPreferences } from '../../src/domain/preferences'
import { parsePreferences } from '../../src/infrastructure/chrome/storage-service'

describe('saved preferences', () => {
  it('fills new preferences with defaults for older saved data', () => {
    expect(parsePreferences({ sortMode: 'title', theme: 'dark', showReflection: false })).toEqual({
      ...defaultPreferences,
      sortMode: 'title',
      theme: 'dark',
      showReflection: false,
    })
  })

  it('clamps the cover angle and rejects malformed values', () => {
    expect(parsePreferences({ coverAngle: 120 }).coverAngle).toBe(80)
    expect(parsePreferences({ coverAngle: 10 }).coverAngle).toBe(45)
    expect(parsePreferences({ coverAngle: 'wide', reduceFlipMotion: 'yes' })).toMatchObject({
      coverAngle: 70,
      reduceFlipMotion: false,
    })
  })
})
