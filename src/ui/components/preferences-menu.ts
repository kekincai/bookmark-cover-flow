import {
  MAX_COVER_ANGLE,
  MIN_COVER_ANGLE,
  type Preferences,
  type SortMode,
  type ThemeMode,
} from '../../domain/preferences'
import type { PreviewCacheService } from '../../infrastructure/chrome/preview-cache-service'
import { t } from '../../shared/i18n'
import { trapTab } from '../focus-trap'
import { icons } from './icons'
import {
  createButton,
  createElement,
  createRange,
  createSelect,
  createSwitch,
  createTileGroup,
  createWallpaperControls,
  setUnavailable,
  settingsGroup,
  settingsHeading,
  settingsId,
  settingsRow,
  type WallpaperControls,
} from './wallpaper-controls'

export interface PreferencesMenuView {
  readonly wallpaper: WallpaperControls
  render(preferences: Preferences): void
  onChange(listener: (change: Partial<Preferences>) => void): void
  destroy(): void
}

export interface PreferencesMenuOptions {
  /** Gear button in the sidebar; the menu owns its click handler and aria-expanded. */
  readonly trigger: HTMLButtonElement
  readonly previewCache: PreviewCacheService
  readonly clearRecent: () => Promise<void>
}

const SORT_MODES: readonly SortMode[] = ['bookmark', 'title', 'domain', 'recent']
const CLEARED_MS = 2000
/** A miniature Cover Flow: two angled side covers around a centre cover. */
const THEME_THUMB =
  '<span class="theme-thumb__side"></span><span class="theme-thumb__cover"></span><span class="theme-thumb__side"></span>'

export function createPreferencesMenu(options: PreferencesMenuOptions): PreferencesMenuView {
  const { trigger, previewCache, clearRecent } = options
  let change: (next: Partial<Preferences>) => void = () => undefined
  const timers = new Set<number>()

  /* ---------- Appearance ---------- */
  const appearanceHeading = settingsHeading(t('appearance'))
  const themes = createTileGroup<ThemeMode>(
    appearanceHeading.id,
    [
      {
        value: 'light',
        label: t('light'),
        thumbClass: 'theme-thumb theme-thumb--light',
        thumbHtml: THEME_THUMB,
      },
      {
        value: 'dark',
        label: t('dark'),
        thumbClass: 'theme-thumb theme-thumb--dark',
        thumbHtml: THEME_THUMB,
      },
      {
        value: 'system',
        label: t('system'),
        thumbClass: 'theme-thumb theme-thumb--system',
        thumbHtml: THEME_THUMB,
      },
    ],
    (theme) => change({ theme }),
  )
  themes.element.classList.add('settings-tiles--themes')
  const themeGroup = settingsGroup(themes.element)
  themeGroup.classList.add('settings-group--tiles')
  const themeSection = createElement('div', 'settings-section')
  themeSection.append(appearanceHeading, themeGroup)

  const sort = createSelect<SortMode>('sort', [
    { value: 'bookmark', label: t('sortBookmark') },
    { value: 'title', label: t('sortTitle') },
    { value: 'domain', label: t('sortWebsite') },
    { value: 'recent', label: t('recent') },
  ])
  const reflection = createSwitch('reflection')
  const preferPreview = createSwitch('prefer-preview')
  const angle = createRange('angle', MIN_COVER_ANGLE, MAX_COVER_ANGLE)
  const reduceFlip = createSwitch('reduce-flip')
  const coverGroup = settingsGroup(
    settingsRow(t('sortBookmarks'), [sort.wrapper], { labelFor: sort.select }).row,
    settingsRow(t('reflection'), [reflection], { labelFor: reflection }).row,
    settingsRow(t('preferPreview'), [preferPreview], {
      sub: t('preferPreviewHint'),
      labelFor: preferPreview,
    }).row,
  )
  const motionGroup = settingsGroup(
    settingsRow(t('coverAngle'), [angle.input, angle.value], { labelFor: angle.input }).row,
    settingsRow(t('reduceFlip'), [reduceFlip], {
      sub: t('reduceFlipHint'),
      labelFor: reduceFlip,
    }).row,
  )
  const appearance = createElement('section', 'settings-pane')
  appearance.append(themeSection, coverGroup, motionGroup)

  sort.select.addEventListener('change', () => {
    const sortMode = SORT_MODES.find((mode) => mode === sort.select.value)
    if (sortMode) change({ sortMode })
  })
  reflection.addEventListener('change', () => change({ showReflection: reflection.checked }))
  preferPreview.addEventListener('change', () =>
    change({ preferPreviewImages: preferPreview.checked }),
  )
  const showAngle = (): void => {
    angle.value.textContent = `${angle.input.value}°`
    angle.input.setAttribute('aria-valuetext', `${angle.input.value}°`)
  }
  angle.input.addEventListener('input', () => {
    showAngle()
    change({ coverAngle: Number(angle.input.value) })
  })
  reduceFlip.addEventListener('change', () => change({ reduceFlipMotion: reduceFlip.checked }))

  /* ---------- Background ---------- */
  const wallpaper = createWallpaperControls()

  /* ---------- Privacy ---------- */
  const statements = (
    [
      ['success', icons.check, 'privacyLocal', 'privacyLocalBody'],
      ['accent', icons.cross, 'privacyNoTracking', 'privacyNoTrackingBody'],
      ['warning', icons.info, 'privacyPreviews', 'privacyPreviewsBody'],
    ] as const
  ).map(([tone, icon, title, body]) => {
    const row = createElement('div', 'settings-row settings-statement')
    const badge = createElement(
      'span',
      `settings-statement__icon settings-statement__icon--${tone}`,
    )
    badge.innerHTML = icon
    const text = createElement('div', 'settings-row__text')
    text.append(
      createElement('span', 'settings-statement__title', t(title)),
      createElement('span', 'settings-row__sub', t(body)),
    )
    row.append(badge, text)
    return row
  })

  /** Show "Cleared" in a row's secondary text for a moment, then the regular text. */
  const flashCleared = (sub: HTMLElement, restore: () => void): void => {
    sub.textContent = t('cleared')
    const timer = window.setTimeout(() => {
      timers.delete(timer)
      restore()
    }, CLEARED_MS)
    timers.add(timer)
  }
  const clearAction = (
    button: HTMLButtonElement,
    sub: HTMLElement,
    run: () => Promise<void>,
    restore: () => void,
  ): void => {
    button.addEventListener('click', () => {
      if (button.hasAttribute('aria-disabled')) return
      setUnavailable(button, true)
      run()
        .then(() => flashCleared(sub, restore))
        .catch((error: unknown) => console.warn('Unable to clear local data.', error))
        .finally(() => setUnavailable(button, false))
    })
  }

  const dataRows: HTMLElement[] = []
  let refreshCache = (): void => undefined
  if (previewCache.available) {
    const clearCache = createButton(t('clear'))
    const cacheRow = settingsRow(t('previewCache'), [clearCache], {
      sub: '',
      describe: [clearCache],
    })
    const cacheSub = cacheRow.sub!
    cacheSub.setAttribute('aria-live', 'polite')
    let generation = 0
    refreshCache = (): void => {
      const current = ++generation
      previewCache
        .count()
        .then((count) => {
          if (current === generation) cacheSub.textContent = t('previewCacheCount', String(count))
        })
        .catch(() => {
          if (current === generation) cacheSub.textContent = ''
        })
    }
    clearAction(clearCache, cacheSub, () => previewCache.clear(), refreshCache)
    dataRows.push(cacheRow.row)
  }
  const clearHistory = createButton(t('clear'))
  const historyRow = settingsRow(t('recentHistory'), [clearHistory], {
    sub: t('recentHistoryHint'),
    describe: [clearHistory],
  })
  const historySub = historyRow.sub!
  historySub.setAttribute('aria-live', 'polite')
  clearAction(clearHistory, historySub, clearRecent, () => {
    historySub.textContent = t('recentHistoryHint')
  })
  dataRows.push(historyRow.row)

  const privacy = createElement('section', 'settings-pane')
  privacy.append(settingsGroup(...statements), settingsGroup(...dataRows))

  /* ---------- Dialog chrome ---------- */
  const overlay = createElement('div', 'settings-overlay')
  overlay.hidden = true
  const dialog = createElement('div', 'settings-dialog')
  dialog.id = settingsId('dialog')
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')
  const title = createElement('h2', 'settings-dialog__title', t('settings'))
  title.id = settingsId('dialog-title')
  dialog.setAttribute('aria-labelledby', title.id)

  const tablist = createElement('div', 'settings-tabs')
  tablist.setAttribute('role', 'tablist')
  tablist.setAttribute('aria-label', t('categories'))
  const panes = [appearance, wallpaper.element, privacy]
  const tabs = (['appearance', 'background', 'privacy'] as const).map((key, index) => {
    const tab = createElement('button', 'settings-tab', t(key))
    tab.type = 'button'
    tab.id = `settings-tab-${key}`
    tab.dataset.tab = key
    tab.setAttribute('role', 'tab')
    const pane = panes[index]!
    pane.id = `settings-pane-${key}`
    pane.setAttribute('role', 'tabpanel')
    pane.setAttribute('aria-labelledby', tab.id)
    tab.setAttribute('aria-controls', pane.id)
    tab.addEventListener('click', () => selectTab(index))
    tablist.append(tab)
    return tab
  })
  let selected = 0
  const selectTab = (index: number): void => {
    selected = index
    tabs.forEach((tab, tabIndex) => {
      const active = tabIndex === index
      tab.setAttribute('aria-selected', String(active))
      tab.tabIndex = active ? 0 : -1
      panes[tabIndex]!.hidden = !active
    })
    body.scrollTop = 0
  }
  tablist.addEventListener('keydown', (event) => {
    const last = tabs.length - 1
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? last
          : event.key === 'ArrowRight' || event.key === 'ArrowDown'
            ? selected === last
              ? 0
              : selected + 1
            : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
              ? selected === 0
                ? last
                : selected - 1
              : undefined
    if (next === undefined) return
    event.preventDefault()
    selectTab(next)
    tabs[next]?.focus()
  })

  const header = createElement('header', 'settings-dialog__header')
  header.append(title, tablist, createElement('span', 'settings-dialog__spacer'))
  const body = createElement('div', 'settings-dialog__body')
  body.append(...panes)
  const footer = createElement('footer', 'settings-dialog__footer')
  const done = createElement('button', 'settings-done', t('done'))
  done.type = 'button'
  footer.append(createElement('span', 'settings-dialog__note', t('changesApplyNow')), done)
  dialog.append(header, body, footer)
  overlay.append(dialog)
  document.body.append(overlay)
  selectTab(0)

  /* ---------- Open / close ---------- */
  let open = false
  let appWasInert = false
  const setOpen = (next: boolean): void => {
    if (next === open) return
    open = next
    const app = document.querySelector<HTMLElement>('#app')
    if (next) {
      appWasInert = app?.inert ?? false
      if (app) app.inert = true
      overlay.hidden = false
      refreshCache()
      tabs[selected]?.focus()
    } else {
      overlay.hidden = true
      if (app) app.inert = appWasInert
      trigger.focus()
    }
    trigger.setAttribute('aria-expanded', String(next))
  }
  const onTrigger = (): void => setOpen(!open)
  trigger.setAttribute('aria-haspopup', 'dialog')
  trigger.setAttribute('aria-controls', dialog.id)
  trigger.setAttribute('aria-expanded', 'false')
  trigger.addEventListener('click', onTrigger)
  done.addEventListener('click', () => setOpen(false))
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) setOpen(false)
  })
  // Every key handled here stays here: arrows adjust controls and must never move covers.
  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
    } else {
      trapTab(dialog, event)
    }
    event.stopPropagation()
  })

  return {
    wallpaper,
    render(preferences): void {
      themes.setChecked(preferences.theme)
      sort.select.value = preferences.sortMode
      reflection.checked = preferences.showReflection
      preferPreview.checked = preferences.preferPreviewImages
      const coverAngle = String(preferences.coverAngle)
      if (angle.input.value !== coverAngle) angle.input.value = coverAngle
      showAngle()
      reduceFlip.checked = preferences.reduceFlipMotion
    },
    onChange(listener): void {
      change = listener
    },
    destroy(): void {
      if (open) setOpen(false)
      timers.forEach((timer) => window.clearTimeout(timer))
      timers.clear()
      trigger.removeEventListener('click', onTrigger)
      trigger.removeAttribute('aria-controls')
      wallpaper.destroy()
      overlay.remove()
    },
  }
}
