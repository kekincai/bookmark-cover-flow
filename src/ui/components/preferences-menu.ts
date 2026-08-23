import type { Preferences, SortMode, ThemeMode } from '../../domain/preferences'

export interface PreferencesMenuView {
  readonly element: HTMLElement
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
    button.dataset.value = choice.value
    button.setAttribute('role', 'radio')
    button.setAttribute('aria-checked', 'false')
    button.textContent = choice.label
    button.addEventListener('click', () => onSelect(choice.value))
    group.append(button)
    return button
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
  trigger.setAttribute('aria-label', 'View options')
  trigger.setAttribute('aria-haspopup', 'dialog')
  trigger.setAttribute('aria-expanded', 'false')
  trigger.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M7 14v6"/></svg>'

  const panel = document.createElement('div')
  panel.className = 'preferences-menu__panel'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-label', 'View options')
  panel.hidden = true

  const panelHeader = document.createElement('header')
  panelHeader.className = 'preferences-menu__header'
  panelHeader.innerHTML = '<strong>View options</strong><span>Tune the cover flow</span>'

  let change: (next: Partial<Preferences>) => void = () => undefined
  const sort = choiceGroup<SortMode>(
    'Sort bookmarks',
    [
      { value: 'bookmark', label: 'Bookmark' },
      { value: 'title', label: 'Title' },
      { value: 'domain', label: 'Website' },
      { value: 'recent', label: 'Recent' },
    ],
    (sortMode) => change({ sortMode }),
  )
  const theme = choiceGroup<ThemeMode>(
    'Color theme',
    [
      { value: 'system', label: 'System' },
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
    ],
    (themeMode) => change({ theme: themeMode }),
  )

  const reflection = document.createElement('input')
  reflection.type = 'checkbox'
  reflection.setAttribute('aria-label', 'Show reflection')
  reflection.className = 'preferences-menu__toggle-input'
  const reflectionField = document.createElement('label')
  reflectionField.className = 'preferences-menu__reflection'
  const reflectionCopy = document.createElement('span')
  reflectionCopy.innerHTML =
    '<strong>Reflection</strong><small>Mirror covers onto the stage</small>'
  const toggle = document.createElement('span')
  toggle.className = 'preferences-menu__toggle'
  toggle.setAttribute('aria-hidden', 'true')
  reflectionField.append(reflectionCopy, reflection, toggle)
  panel.append(panelHeader, sort.field, theme.field, reflectionField)
  element.append(trigger, panel)

  const setOpen = (open: boolean): void => {
    panel.hidden = !open
    trigger.setAttribute('aria-expanded', String(open))
    if (open) sort.buttons[0]?.focus()
  }

  trigger.addEventListener('click', () => setOpen(panel.hidden))
  reflection.addEventListener('change', () => change({ showReflection: reflection.checked }))

  const onPointerDown = (event: PointerEvent): void => {
    if (!panel.hidden && event.target instanceof Node && !element.contains(event.target))
      setOpen(false)
  }
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || panel.hidden) return
    setOpen(false)
    trigger.focus()
    event.stopPropagation()
  }
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKeyDown)

  return {
    element,
    render(preferences): void {
      sort.buttons.forEach((button) => {
        button.setAttribute('aria-checked', String(button.dataset.value === preferences.sortMode))
      })
      theme.buttons.forEach((button) => {
        button.setAttribute('aria-checked', String(button.dataset.value === preferences.theme))
      })
      reflection.checked = preferences.showReflection
    },
    onChange(listener): void {
      change = listener
    },
    destroy(): void {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    },
  }
}
