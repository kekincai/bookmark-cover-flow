import en from '../../public/_locales/en/messages.json'
import zhCN from '../../public/_locales/zh_CN/messages.json'
import zhTW from '../../public/_locales/zh_TW/messages.json'
import ja from '../../public/_locales/ja/messages.json'

export type MessageKey = keyof typeof en
export type Locale = 'en' | 'zh_CN' | 'zh_TW' | 'ja'
const catalogs = { en, zh_CN: zhCN, zh_TW: zhTW, ja }

export function resolveLocale(language: string): Locale {
  const normalized = language.toLowerCase().replaceAll('_', '-')
  if (/^zh(?:-|$)/.test(normalized)) return /(?:hant|tw|hk|mo)/.test(normalized) ? 'zh_TW' : 'zh_CN'
  return /^ja(?:-|$)/.test(normalized) ? 'ja' : 'en'
}

export function currentLocale(): Locale {
  const language =
    typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage
      ? chrome.i18n.getUILanguage()
      : typeof navigator !== 'undefined'
        ? navigator.language
        : 'en'
  return resolveLocale(language)
}

export function translate(
  key: MessageKey,
  locale: Locale,
  substitutions: readonly string[] = [],
): string {
  return catalogs[locale][key].message.replace(
    /\$(\d)/g,
    (_, index: string) => substitutions[Number(index) - 1] ?? '',
  )
}

export function t(key: MessageKey, ...substitutions: string[]): string {
  const native =
    typeof chrome !== 'undefined' && chrome.i18n?.getMessage
      ? chrome.i18n.getMessage(key, substitutions)
      : ''
  return native || translate(key, currentLocale(), substitutions)
}

/** Keep domain/storage errors independent of the rendering locale. */
export function localizeError(message: string): string {
  if (!message) return ''
  const match = (Object.keys(en) as MessageKey[]).find((key) => en[key].message === message)
  if (match) return t(match)
  if (currentLocale() === 'en') return message
  if (/quota|disk|storage/i.test(message)) return t('storageSaveFailed')
  return currentLocale() === 'en' ? message : t('genericError')
}

export function initializeLocale(): void {
  document.documentElement.lang = currentLocale().replace('_', '-')
  document.title = t('extensionName')
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', t('extensionDescription'))
}
