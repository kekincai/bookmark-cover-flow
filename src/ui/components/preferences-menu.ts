import type { Preferences, SortMode, ThemeMode } from '../../domain/preferences'
import { createWallpaperControls, type WallpaperControls } from './wallpaper-controls'
import { t } from '../../shared/i18n'

export interface PreferencesMenuView {
  readonly element: HTMLElement
  readonly wallpaper: WallpaperControls
  render(preferences: Preferences): void
  onChange(listener: (change: Partial<Preferences>) => void): void
  destroy(): void
}

type Choice<T extends string> = { readonly value: T; readonly label: string }

function choiceGroup<T extends string>(
  label: string,
  choices: readonly Choice<T>[],
  onSelect: (value: T) => void,
): { readonly field: HTMLElement; readonly buttons: readonly HTMLButtonElement[] } {
  const field = document.createElement('section')
  field.className = 'preferences-menu__field'
  const heading = document.createElement('p')
  heading.className = 'preferences-menu__label'
  heading.textContent = label
  const group = document.createElement('div')
  group.className = 'preferences-menu__choices'
  group.setAttribute('role', 'radiogroup')
  group.setAttribute('aria-label', label)
  const buttons = choices.map((choice) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'preferences-menu__choice'
    button.dataset.liquidItem = ''
    button.dataset.value = choice.value
    button.setAttribute('role', 'radio')
    button.setAttribute('aria-checked', 'false')
    button.textContent = choice.label
    button.addEventListener('click', () => onSelect(choice.value))
    group.append(button)
    return button
  })
  group.addEventListener('keydown', (event) => {
    const index = buttons.findIndex((button) => button === document.activeElement)
    if (index < 0) return
    const delta =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0
    if (!delta) return
    const next = buttons[(index + delta + buttons.length) % buttons.length]
    next?.focus()
    next?.click()
    event.preventDefault()
    event.stopPropagation()
  })
  field.append(heading, group)
  return { field, buttons }
}

export function createPreferencesMenu(): PreferencesMenuView {
  const element = document.createElement('div')
  element.className = 'preferences-menu'
  const trigger = document.createElement('button')
  trigger.type = 'button'
  trigger.className = 'preferences-menu__trigger'
  trigger.dataset.liquidItem = ''
  trigger.setAttribute('aria-label', t('viewOptions'))
  trigger.setAttribute('aria-haspopup', 'dialog')
  trigger.setAttribute('aria-expanded', 'false')
  trigger.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M7 14v6"/></svg>'

  const panel = document.createElement('div')
  panel.className = 'preferences-menu__panel settings-drawer'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-label', t('settings'))
  panel.setAttribute('aria-modal', 'true')
  panel.hidden = true

  const panelHeader = document.createElement('header')
  panelHeader.className = 'settings-header'
  panelHeader.innerHTML = `<div><span class="settings-eyebrow">Bookmark Cover Flow</span><h2>${t('settings')}</h2></div><button type="button" class="settings-close" aria-label="${t('closeSettings')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg></button>`
  const scrim = document.createElement('div')
  scrim.className = 'settings-scrim'
  scrim.hidden = true
  const wallpaper = createWallpaperControls()
  const appearance = document.createElement('section')
  appearance.innerHTML = `<header class="settings-pane-header"><h3>${t('appearance')}</h3><p>${t('appearanceDescription')}</p></header>`
  appearance.className = 'settings-pane'
  const body = document.createElement('div')
  body.className = 'settings-body'
  const tabs = document.createElement('nav')
  tabs.className = 'settings-tabs'
  tabs.setAttribute('role', 'tablist')
  tabs.setAttribute('aria-label', t('categories'))
  tabs.setAttribute('aria-orientation', 'horizontal')
  const panes = [appearance, wallpaper.element]
  const tabButtons = [t('appearance'), t('background')].map((name, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.id = `settings-tab-${index}`
    button.dataset.liquidItem = ''
    button.setAttribute('role', 'tab')
    button.setAttribute('aria-controls', `settings-pane-${index}`)
    button.className = 'settings-tab'
    button.textContent = name
    button.addEventListener('click', () => selectTab(index))
    tabs.append(button)
    const pane = panes[index]!
    pane.id = `settings-pane-${index}`
    pane.setAttribute('role', 'tabpanel')
    pane.setAttribute('aria-labelledby', button.id)
    return button
  })
  const selectTab = (selected: number): void => {
    tabButtons.forEach((button, index) => {
      button.setAttribute('aria-selected', String(index === selected))
      button.classList.toggle('is-active', index === selected)
      button.tabIndex = index === selected ? 0 : -1
      panes[index]!.hidden = index !== selected
    })
  }
  selectTab(0)
  tabs.addEventListener('keydown', (event) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key))
      return
    const current = tabButtons.indexOf(document.activeElement as HTMLButtonElement)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : (current + 1) % 2
    selectTab(next)
    tabButtons[next]?.focus()
    event.preventDefault()
    event.stopPropagation()
  })

  let change: (next: Partial<Preferences>) => void = () => undefined
  const sort = choiceGroup<SortMode>(
    t('sortBookmarks'),
    [
      { value: 'bookmark', label: t('sortBookmark') },
      { value: 'title', label: t('sortTitle') },
      { value: 'domain', label: t('sortWebsite') },
      { value: 'recent', label: t('recent') },
    ],
    (sortMode) => change({ sortMode }),
  )
  const theme = choiceGroup<ThemeMode>(
    t('colorTheme'),
    [
      { value: 'system', label: t('system') },
      { value: 'light', label: t('light') },
      { value: 'dark', label: t('dark') },
    ],
    (themeMode) => change({ theme: themeMode }),
  )

  const reflection = document.createElement('input')
  reflection.type = 'checkbox'
  reflection.setAttribute('aria-label', t('showReflection'))
  reflection.className = 'preferences-menu__toggle-input'
  const reflectionField = document.createElement('label')
  reflectionField.className = 'preferences-menu__reflection'
  const reflectionCopy = document.createElement('span')
  reflectionCopy.innerHTML = `<strong>${t('reflection')}</strong><small>${t('reflectionDescription')}</small>`
  const toggle = document.createElement('span')
  toggle.className = 'liquid-toggle-track'
  toggle.setAttribute('aria-hidden', 'true')
  toggle.innerHTML = '<span class="liquid-toggle-thumb"></span>'
  const liquidToggle = document.createElement('liquid-toggle')
  liquidToggle.append(reflection, toggle)
  reflectionField.classList.add('toggle-row')
  reflectionField.append(reflectionCopy, liquidToggle)
  const basic = document.createElement('section')
  basic.className = 'settings-group'
  basic.innerHTML = `<h4>${t('basicPreferences')}</h4>`
  basic.append(sort.field, theme.field)
  const visuals = document.createElement('section')
  visuals.className = 'settings-group settings-list'
  visuals.innerHTML = `<h4>${t('visualExperience')}</h4>`
  visuals.append(reflectionField)
  appearance.append(basic, visuals)
  body.append(tabs, ...panes)
  panel.append(panelHeader, body)
  element.append(trigger)
  document.body.append(scrim, panel)

  let previouslyInert = false
  let openState = false
  let closeTimer = 0
  const setOpen = (open: boolean): void => {
    if (open === openState) return
    openState = open
    window.clearTimeout(closeTimer)
    const app = document.querySelector<HTMLElement>('#app')
    if (open) {
      previouslyInert = app?.inert ?? false
      panel.hidden = false
    } else {
      closeTimer = window.setTimeout(() => {
        panel.hidden = true
      }, 360)
    }
    panel.inert = !open
    panel.setAttribute('aria-hidden', String(!open))
    panel.classList.toggle('is-open', open)
    scrim.hidden = !open
    if (app) app.inert = open || previouslyInert
    trigger.setAttribute('aria-expanded', String(open))
    if (open) panelHeader.querySelector('button')!.focus()
    else trigger.focus()
  }

  trigger.addEventListener('click', () => setOpen(!openState))
  panelHeader.querySelector('button')!.addEventListener('click', () => setOpen(false))
  scrim.addEventListener('click', () => setOpen(false))
  reflection.addEventListener('change', () => change({ showReflection: reflection.checked }))

  const onKeyDown = (event: KeyboardEvent): void => {
    if (!openState) return
    if (event.key === 'Escape') {
      setOpen(false)
      event.preventDefault()
      event.stopPropagation()
    } else if (event.key === 'Tab') {
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>('button, input, [tabindex="0"]'),
      ).filter(
        (node) =>
          node.tabIndex >= 0 && !node.matches(':disabled') && node.getClientRects().length > 0,
      )
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        last?.focus()
        event.preventDefault()
      } else if (!event.shiftKey && document.activeElement === last) {
        first?.focus()
        event.preventDefault()
      }
    }
  }
  document.addEventListener('keydown', onKeyDown)

  return {
    element,
    wallpaper,
    render(preferences): void {
      sort.buttons.forEach((button) => {
        button.setAttribute('aria-checked', String(button.dataset.value === preferences.sortMode))
        button.tabIndex = button.dataset.value === preferences.sortMode ? 0 : -1
      })
      theme.buttons.forEach((button) => {
        button.setAttribute('aria-checked', String(button.dataset.value === preferences.theme))
        button.tabIndex = button.dataset.value === preferences.theme ? 0 : -1
      })
      reflection.checked = preferences.showReflection
      liquidToggle.classList.toggle('is-checked', reflection.checked)
    },
    onChange(listener): void {
      change = listener
    },
    destroy(): void {
      if (!panel.hidden) setOpen(false)
      window.clearTimeout(closeTimer)
      document.removeEventListener('keydown', onKeyDown)
      wallpaper.destroy()
      panel.remove()
      scrim.remove()
    },
  }
}
