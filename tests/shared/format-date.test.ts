import { describe, expect, it } from 'vitest'
import {
  formatAddedDate,
  formatLastOpened,
  toLanguageTag,
  type RelativeDateLabels,
} from '../../src/shared/format-date'
import { translate } from '../../src/shared/i18n'

const labels: RelativeDateLabels = {
  never: 'NEVER',
  todayAt: (time) => `TODAY ${time}`,
  yesterdayAt: (time) => `YESTERDAY ${time}`,
}

// Local-time constructors keep every expectation independent of the machine's time zone.
const now = new Date(2024, 9, 31, 15, 30).getTime()
const at = (month: number, day: number, hour = 14, minute = 5): number =>
  new Date(2024, month, day, hour, minute).getTime()

describe('formatAddedDate', () => {
  it('formats numeric year, month and day with the locale order', () => {
    const date = new Date(2023, 8, 4, 12).getTime()
    expect(formatAddedDate(date, 'zh_CN')).toBe('2023/09/04')
    expect(formatAddedDate(date, 'en')).toBe(
      new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(
        date,
      ),
    )
  })
})

describe('formatLastOpened', () => {
  it('shows the never label when the bookmark was never opened', () => {
    expect(formatLastOpened(undefined, now, 'en', labels)).toBe('NEVER')
  })

  it('uses the today label with a 24-hour time', () => {
    expect(formatLastOpened(at(9, 31, 14, 5), now, 'en', labels)).toBe('TODAY 14:05')
    expect(formatLastOpened(at(9, 31, 0, 0), now, 'zh_CN', labels)).toBe('TODAY 00:00')
  })

  it('uses the yesterday label for the previous calendar day', () => {
    expect(formatLastOpened(at(9, 30, 23, 59), now, 'en', labels)).toBe('YESTERDAY 23:59')
    expect(formatLastOpened(at(9, 30, 0, 0), now, 'en', labels)).toBe('YESTERDAY 00:00')
  })

  it('uses a short weekday and time within the last six days', () => {
    const date = at(9, 26, 9, 15)
    const expected = new Intl.DateTimeFormat('zh-CN', {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(date)
    expect(formatLastOpened(date, now, 'zh_CN', labels)).toBe(expected)
    // Six calendar days back is still a weekday; the seventh switches to month and day.
    expect(formatLastOpened(at(9, 25, 0, 0), now, 'en', labels)).toMatch(/^[A-Z][a-z]{2} 00:00$/)
  })

  it('falls back to month and day for older dates', () => {
    expect(formatLastOpened(at(9, 24), now, 'en', labels)).toBe('Oct 24')
    expect(formatLastOpened(at(9, 24), now, 'zh_CN', labels)).toBe('10月24日')
  })

  it('defaults to the catalog labels of the requested locale', () => {
    expect(formatLastOpened(undefined, now, 'en')).toBe(translate('never', 'en'))
    expect(formatLastOpened(at(9, 31, 8, 0), now, 'zh_CN')).toBe(
      translate('todayAt', 'zh_CN', ['08:00']),
    )
    expect(formatLastOpened(at(9, 30, 8, 0), now, 'ja')).toBe(
      translate('yesterdayAt', 'ja', ['08:00']),
    )
  })

  it('maps catalog locales to BCP 47 tags', () => {
    expect(toLanguageTag('zh_CN')).toBe('zh-CN')
    expect(toLanguageTag('zh_TW')).toBe('zh-TW')
    expect(toLanguageTag('en')).toBe('en')
  })
})
