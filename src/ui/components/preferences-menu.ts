import {
  MAX_COVER_ANGLE,
  MIN_COVER_ANGLE,
  type Preferences,
  type SortMode,
  type ThemeMode,
} from '../../domain/preferences'
import type { PreviewAccess } from '../../infrastructure/chrome/preview-access'
import type { PreviewCacheService } from '../../infrastructure/chrome/preview-cache-service'
import { t } from '../../shared/i18n'
import { createAnnouncer } from '../dom/announcer'
import { isUnavailable } from '../dom/controls'
import { fragment, html } from '../dom/markup'
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
  /** Fires after the dialog opens and after it closes. */
  onToggle(listener: (open: boolean) => void): void
  render(preferences: Preferences): void
  onChange(listener: (change: Partial<Preferences>) => void): void
  destroy(): void
}

export interface PreferencesMenuOptions {
  /** Gear button in the sidebar; it opens the dialog declaratively (command="show-modal"). */
  readonly trigger: HTMLButtonElement
  readonly previewCache: PreviewCacheService
  readonly previewAccess: PreviewAccess
  readonly clearRecent: () => Promise<void>
}

const SORT_MODES: readonly SortMode[] = ['bookmark', 'title', 'domain', 'recent']
const CLEARED_MS = 2000
/** A miniature Cover Flow: two angled side covers around a centre cover. */
const THEME_THUMB = html`<span class="theme-thumb__side"></span
  ><span class="theme-thumb__cover"></span><span class="theme-thumb__side"></span>`

export function createPreferencesMenu(options: PreferencesMenuOptions): PreferencesMenuView {
  const { trigger, previewCache, previewAccess, clearRecent } = options
  let change: (next: Partial<Preferences>) => void = () => undefined
  let toggled: (open: boolean) => void = () => undefined
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
        thumb: THEME_THUMB,
      },
      {
        value: 'dark',
        label: t('dark'),
        thumbClass: 'theme-thumb theme-thumb--dark',
        thumb: THEME_THUMB,
      },
      {
        value: 'system',
        label: t('system'),
        thumbClass: 'theme-thumb theme-thumb--system',
        thumb: THEME_THUMB,
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
  const shortcuts = createSwitch('single-key-shortcuts')
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
  const keyboardGroup = settingsGroup(
    settingsRow(t('singleKeyShortcuts'), [shortcuts], {
      sub: t('singleKeyShortcutsHint'),
      labelFor: shortcuts,
    }).row,
  )
  const appearance = createElement('section', 'settings-pane')
  appearance.append(themeSection, coverGroup, motionGroup, keyboardGroup)

  sort.select.addEventListener('change', () => {
    const sortMode = SORT_MODES.find((mode) => mode === sort.select.value)
    if (sortMode) change({ sortMode })
  })
  reflection.addEventListener('change', () => change({ showReflection: reflection.checked }))
  // Website access is requested here, inside the user's gesture: nothing may be awaited before
  // `request()`. Turning previews off hands the access back.
  preferPreview.addEventListener('change', () => {
    if (!preferPreview.checked) {
      change({ preferPreviewImages: false })
      void previewAccess.release()
      return
    }
    const granted = previewAccess.request()
    void (async () => {
      if (await granted) {
        change({ preferPreviewImages: true })
      } else {
        preferPreview.checked = false
        announcer.say(t('previewAccessDenied'))
      }
    })()
  })
  shortcuts.addEventListener('change', () => change({ singleKeyShortcuts: shortcuts.checked }))
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
    badge.append(fragment(icon))
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
    const clear = async (): Promise<void> => {
      if (isUnavailable(button)) return
      setUnavailable(button, true)
      try {
        await run()
        flashCleared(sub, restore)
      } catch (error: unknown) {
        console.warn('Unable to clear local data.', error)
      } finally {
        setUnavailable(button, false)
      }
    }
    button.addEventListener('click', () => void clear())
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
    cacheSub.setAttribute('role', 'status')
    let generation = 0
    refreshCache = (): void => {
      const current = ++generation
      void (async () => {
        let text = ''
        try {
          text = t('previewCacheCount', String(await previewCache.count()))
        } catch {
          // An unreadable cache just shows no count.
        }
        if (current === generation) cacheSub.textContent = text
      })()
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
  historySub.setAttribute('role', 'status')
  clearAction(clearHistory, historySub, clearRecent, () => {
    historySub.textContent = t('recentHistoryHint')
  })
  dataRows.push(historyRow.row)

  const privacy = createElement('section', 'settings-pane')
  privacy.append(settingsGroup(...statements), settingsGroup(...dataRows))

  /* ---------- Dialog chrome ---------- */
  // A native modal <dialog>: the browser makes the page inert, contains focus, closes on Esc (and,
  // with closedby="any", on a backdrop click) and returns focus to the gear button.
  const dialog = createElement('dialog', 'settings-dialog')
  dialog.id = settingsId('dialog')
  dialog.setAttribute('closedby', 'any')
  const title = createElement('h1', 'settings-dialog__title', t('settings'))
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
    // Find-in-page can reveal text on a hidden tab: select that tab when it does.
    pane.addEventListener('beforematch', () => selectTab(index))
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
      // The dialog focuses the selected tab when it opens.
      tab.autofocus = active
      // until-found keeps inactive panes searchable with Ctrl+F.
      if (active) panes[tabIndex]!.removeAttribute('hidden')
      else panes[tabIndex]!.setAttribute('hidden', 'until-found')
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
  done.setAttribute('command', 'close')
  done.setAttribute('commandfor', dialog.id)
  footer.append(createElement('span', 'settings-dialog__note', t('changesApplyNow')), done)
  // The page behind a modal is inert, so the dialog carries its own live region.
  const announcer = createAnnouncer({ assertive: false })
  dialog.append(header, body, footer, announcer.element)
  document.body.append(dialog)
  selectTab(0)

  /* ---------- Open / close ---------- */
  trigger.setAttribute('aria-haspopup', 'dialog')
  trigger.setAttribute('command', 'show-modal')
  trigger.setAttribute('commandfor', dialog.id)
  const onToggleEvent = (event: Event): void => {
    const open = (event as ToggleEvent).newState === 'open'
    if (open) refreshCache()
    toggled(open)
  }
  dialog.addEventListener('toggle', onToggleEvent)
  // Keys pressed in Settings adjust its controls and must never move the covers behind it. Esc
  // still closes: the close request is the key's default action, not its propagation.
  const stopKeys = (event: KeyboardEvent): void => event.stopPropagation()
  dialog.addEventListener('keydown', stopKeys)

  return {
    wallpaper,
    onToggle(listener): void {
      toggled = listener
    },
    render(preferences): void {
      themes.setChecked(preferences.theme)
      sort.select.value = preferences.sortMode
      reflection.checked = preferences.showReflection
      preferPreview.checked = preferences.preferPreviewImages
      const coverAngle = String(preferences.coverAngle)
      if (angle.input.value !== coverAngle) angle.input.value = coverAngle
      showAngle()
      reduceFlip.checked = preferences.reduceFlipMotion
      shortcuts.checked = preferences.singleKeyShortcuts
    },
    onChange(listener): void {
      change = listener
    },
    destroy(): void {
      if (dialog.open) dialog.close()
      timers.forEach((timer) => window.clearTimeout(timer))
      timers.clear()
      dialog.removeEventListener('toggle', onToggleEvent)
      dialog.removeEventListener('keydown', stopKeys)
      trigger.removeAttribute('command')
      trigger.removeAttribute('commandfor')
      wallpaper.destroy()
      dialog.remove()
    },
  }
}
