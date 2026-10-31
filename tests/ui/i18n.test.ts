import { afterEach, describe, expect, it, vi } from 'vitest'
import { currentLocale, localizeError, resolveLocale, t, translate } from '../../src/shared/i18n'
import en from '../../public/_locales/en/messages.json'
import zhCN from '../../public/_locales/zh_CN/messages.json'
import zhTW from '../../public/_locales/zh_TW/messages.json'
import ja from '../../public/_locales/ja/messages.json'

afterEach(() => vi.unstubAllGlobals())
describe('automatic locale resolution', () => {
  it('maps region and script variants, with an explicit English fallback', () => {
    expect(resolveLocale('zh-Hans-SG')).toBe('zh_CN')
    expect(resolveLocale('zh')).toBe('zh_CN')
    expect(resolveLocale('zh_HK')).toBe('zh_TW')
    expect(resolveLocale('zh-Hant-TW')).toBe('zh_TW')
    expect(resolveLocale('ja-JP')).toBe('ja')
    expect(resolveLocale('fr-FR')).toBe('en')
  })
  it('uses the Chrome UI language ahead of website language preferences', () => {
    vi.stubGlobal('navigator', { language: 'en-US' })
    vi.stubGlobal('chrome', { i18n: { getUILanguage: () => 'zh-CN', getMessage: () => '' } })
    expect(currentLocale()).toBe('zh_CN')
    expect(t('settings')).toBe('设置')
  })
  it('uses native Chrome messages when available', () => {
    vi.stubGlobal('chrome', { i18n: { getUILanguage: () => 'ja', getMessage: () => '設定' } })
    expect(t('settings')).toBe('設定')
  })
  it('supports substitutions without altering user titles', () => {
    expect(translate('positionValue', 'zh_CN', ['3', '42'])).toBe('第 3 个，共 42 个')
    expect(translate('positionValue', 'ja', ['3', '42'])).toBe('42 件中 3 件目')
    expect(translate('matchCount', 'zh_CN', ['2', 'My $1 folder'])).toBe('2 个匹配“My $1 folder”')
    expect(translate('matchCount', 'ja', ['2', 'My folder'])).toBe(
      '「My folder」に一致する項目 2 件',
    )
  })
  it('all shipped catalogs are complete and nonempty', () => {
    for (const catalog of [zhCN, zhTW, ja]) {
      expect(Object.keys(catalog).sort()).toEqual(Object.keys(en).sort())
      expect(Object.values(catalog).every((entry) => entry.message.trim().length > 0)).toBe(true)
    }
  })
  it('localizes decode failures and native storage errors', () => {
    vi.stubGlobal('navigator', { language: 'zh-CN' })
    vi.stubGlobal('chrome', undefined)
    expect(localizeError(en.decodeFailed.message)).toContain('无法解码')
    expect(localizeError('QuotaExceededError')).toContain('存储空间')
    expect(localizeError('Unexpected native error')).toBe('无法保存背景，请重试。')
  })
})
