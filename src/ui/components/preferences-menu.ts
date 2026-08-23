import type { Preferences, SortMode, ThemeMode } from '../../domain/preferences'

export interface PreferencesMenuView {
  readonly element: HTMLElement
  render(preferences: Preferences): void
  onChange(listener: (change: Partial<Preferences>) => void): void
  destroy(): void
}

function option(value: string, label: string): HTMLOptionElement {
  const element = document.createElement('option')
  element.value = value
  element.textContent = label
  return element
}

function field(labelText: string, control: HTMLElement): HTMLLabelElement {
  const label = document.createElement('label')
  label.className = 'preferences-menu__field'
  const text = document.createElement('span')
  text.textContent = labelText
  label.append(text, control)
  return label
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

  const sort = document.createElement('select')
  sort.setAttribute('aria-label', 'Sort bookmarks')
  sort.append(
    option('bookmark', 'Bookmark order'),
    option('title', 'Title'),
    option('domain', 'Website'),
    option('recent', 'Recently opened'),
  )

  const theme = document.createElement('select')
  theme.setAttribute('aria-label', 'Color theme')
  theme.append(option('system', 'System'), option('light', 'Light'), option('dark', 'Dark'))

  const reflection = document.createElement('input')
  reflection.type = 'checkbox'
  reflection.setAttribute('aria-label', 'Show reflection')
  const reflectionField = field('Reflection', reflection)
  reflectionField.classList.add('preferences-menu__field--toggle')
  panel.append(field('Sort', sort), field('Theme', theme), reflectionField)
  element.append(trigger, panel)

  let change: (next: Partial<Preferences>) => void = () => undefined

  const setOpen = (open: boolean): void => {
    panel.hidden = !open
    trigger.setAttribute('aria-expanded', String(open))
    if (open) sort.focus()
  }

  trigger.addEventListener('click', () => setOpen(panel.hidden))
  sort.addEventListener('change', () => change({ sortMode: sort.value as SortMode }))
  theme.addEventListener('change', () => change({ theme: theme.value as ThemeMode }))
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
      sort.value = preferences.sortMode
      theme.value = preferences.theme
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
