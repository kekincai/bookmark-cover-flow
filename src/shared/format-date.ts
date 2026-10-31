import { translate, type Locale } from './i18n'

/** Labels for the relative "last opened" branches; injectable for tests. */
export interface RelativeDateLabels {
  readonly never: string
  todayAt(time: string): string
  yesterdayAt(time: string): string
}

export function toLanguageTag(locale: Locale): string {
  return locale.replace('_', '-')
}

export function defaultRelativeLabels(locale: Locale): RelativeDateLabels {
  return {
    never: translate('never', locale),
    todayAt: (time) => translate('todayAt', locale, [time]),
    yesterdayAt: (time) => translate('yesterdayAt', locale, [time]),
  }
}

type FormatKind = 'added' | 'time' | 'weekday' | 'monthDay'
const formatOptions: Record<FormatKind, Intl.DateTimeFormatOptions> = {
  added: { year: 'numeric', month: '2-digit', day: '2-digit' },
  time: { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
  weekday: { weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
  monthDay: { month: 'short', day: 'numeric' },
}
const formatters = new Map<string, Intl.DateTimeFormat>()

/** Formatters are cached: list rows format dates on every scroll. */
export function getDateFormatter(locale: Locale, kind: FormatKind): Intl.DateTimeFormat {
  const key = `${locale}:${kind}`
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(toLanguageTag(locale), formatOptions[kind])
    formatters.set(key, formatter)
  }
  return formatter
}

/** Numeric year/month/day, e.g. `2023/09/04` in zh-CN. */
export function formatAddedDate(epochMs: number, locale: Locale): string {
  return getDateFormatter(locale, 'added').format(epochMs)
}

function startOfDay(epochMs: number, dayOffset = 0): number {
  const date = new Date(epochMs)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + dayOffset)
  return date.getTime()
}

/**
 * Finder-style relative date: Never, Today 14:05, Yesterday 09:30, a short weekday within the
 * last six days, otherwise month and day. Calendar days use the local time zone.
 */
export function formatLastOpened(
  epochMs: number | undefined,
  now: number,
  locale: Locale,
  labels: RelativeDateLabels = defaultRelativeLabels(locale),
): string {
  if (epochMs === undefined || !Number.isFinite(epochMs)) return labels.never
  const today = startOfDay(now)
  const tomorrow = startOfDay(now, 1)
  if (epochMs >= today && epochMs < tomorrow) {
    return labels.todayAt(getDateFormatter(locale, 'time').format(epochMs))
  }
  if (epochMs >= startOfDay(now, -1) && epochMs < today) {
    return labels.yesterdayAt(getDateFormatter(locale, 'time').format(epochMs))
  }
  if (epochMs >= startOfDay(now, -6) && epochMs < today) {
    return getDateFormatter(locale, 'weekday').format(epochMs)
  }
  return getDateFormatter(locale, 'monthDay').format(epochMs)
}
