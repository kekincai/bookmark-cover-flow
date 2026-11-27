import type { BookmarkFolder } from '../../domain/bookmark'
import { t } from '../../shared/i18n'
import { fragment } from '../dom/markup'
import { icons } from './icons'
import { createSearchBox, type SearchBoxView } from './search-box'

export type SidebarIcon = 'library' | 'recent' | 'added' | 'folder'

export interface SidebarEntry {
  readonly id: string
  readonly title: string
  /** Omitted for a folder that only holds subfolders, where "0" would read as empty. */
  readonly count?: number
  readonly icon: SidebarIcon
  readonly depth: number
}

export interface SidebarGroup {
  readonly title: string
  readonly entries: readonly SidebarEntry[]
}

export interface SidebarView {
  readonly element: HTMLElement
  readonly search: SearchBoxView
  readonly settingsButton: HTMLButtonElement
  render(groups: readonly SidebarGroup[], activeId: string | undefined): void
  onSelect(listener: (id: string) => void): void
}

const MAX_DEPTH = 3

/** A root holds its own bookmarks first (when it has any), then every nested folder. */
export function folderEntries(root: BookmarkFolder): readonly SidebarEntry[] {
  const nested = (folder: BookmarkFolder, depth: number): SidebarEntry[] => [
    {
      id: folder.id,
      title: folder.title,
      ...(folder.children.length === 0 && folder.folders.length > 0
        ? {}
        : { count: folder.children.length }),
      icon: 'folder',
      depth: Math.min(depth, MAX_DEPTH),
    },
    ...folder.folders.flatMap((child) => nested(child, depth + 1)),
  ]
  return [
    ...(root.children.length > 0
      ? [
          {
            id: root.id,
            title: root.title,
            count: root.children.length,
            icon: 'folder',
            depth: 0,
          } as const,
        ]
      : []),
    ...root.folders.flatMap((folder) => nested(folder, 0)),
  ]
}

/** Everything that decides the sidebar's DOM shape; counts and the active source do not. */
const structureKey = (groups: readonly SidebarGroup[]): string =>
  JSON.stringify(
    groups.map((group) => [
      group.title,
      group.entries.map((entry) => [entry.id, entry.title, entry.icon, entry.depth]),
    ]),
  )

interface RenderedItem {
  readonly id: string
  readonly button: HTMLButtonElement
  readonly count: HTMLSpanElement
}

function createItem(entry: SidebarEntry): RenderedItem {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'sidebar-item'
  button.dataset.sourceId = entry.id
  button.style.setProperty('--depth', String(entry.depth))
  // `.truncate` holds exactly one <span>, which slides to reveal a cut-off title on hover/focus.
  const title = document.createElement('span')
  title.className = 'sidebar-item__title truncate'
  const text = document.createElement('span')
  text.textContent = entry.title
  title.append(text)
  const count = document.createElement('span')
  count.className = 'sidebar-item__count'
  button.append(fragment(icons[entry.icon]), title, count)
  return { id: entry.id, button, count }
}

export function createSidebar(): SidebarView {
  const element = document.createElement('nav')
  element.className = 'sidebar'
  element.setAttribute('aria-label', t('bookmarkFolders'))
  const search = createSearchBox()
  const groupsElement = document.createElement('div')
  groupsElement.className = 'sidebar__groups'
  const footer = document.createElement('div')
  footer.className = 'sidebar__footer'
  const settingsButton = document.createElement('button')
  settingsButton.type = 'button'
  settingsButton.className = 'icon-button'
  settingsButton.setAttribute('aria-label', t('viewOptions'))
  settingsButton.setAttribute('aria-haspopup', 'dialog')
  settingsButton.append(fragment(icons.gear))
  const note = document.createElement('span')
  note.className = 'sidebar__note'
  note.textContent = t('localOnly')
  footer.append(settingsButton, note)
  element.append(search.element, groupsElement, footer)

  let select: (id: string) => void = () => undefined
  let renderedKey: string | undefined
  /** In DOM order, parallel to the entries of the non-empty groups last rendered. */
  let rendered: RenderedItem[] = []

  // One delegated listener for every source, so re-rendering never re-binds handlers.
  groupsElement.addEventListener('click', (event) => {
    const item = (event.target as Element | null)?.closest<HTMLButtonElement>('.sidebar-item')
    const id = item?.dataset.sourceId
    if (item && groupsElement.contains(item) && id !== undefined) select(id)
  })

  // Arrow keys move between sources here and never reach the cover flow.
  groupsElement.addEventListener('keydown', (event) => {
    const list = rendered.map((item) => item.button)
    const index = list.indexOf(document.activeElement as HTMLButtonElement)
    if (index < 0) return
    const target =
      event.key === 'ArrowDown'
        ? list[Math.min(list.length - 1, index + 1)]
        : event.key === 'ArrowUp'
          ? list[Math.max(0, index - 1)]
          : event.key === 'Home'
            ? list[0]
            : event.key === 'End'
              ? list.at(-1)
              : undefined
    if (target === undefined) return
    list.forEach((item) => (item.tabIndex = item === target ? 0 : -1))
    target.focus()
    event.preventDefault()
  })

  const rebuild = (groups: readonly SidebarGroup[]): void => {
    const focusedId = (document.activeElement as HTMLElement | null)?.dataset?.sourceId
    const items: RenderedItem[] = []
    groupsElement.replaceChildren(
      ...groups.map((group) => {
        const section = document.createElement('section')
        section.className = 'sidebar__group'
        const heading = document.createElement('h2')
        heading.className = 'sidebar__heading'
        heading.textContent = group.title
        section.append(heading)
        for (const entry of group.entries) {
          const item = createItem(entry)
          items.push(item)
          section.append(item.button)
        }
        return section
      }),
    )
    rendered = items
    if (focusedId !== undefined)
      items.find((item) => item.id === focusedId)?.button.focus({ preventScroll: true })
  }

  return {
    element,
    search,
    settingsButton,
    render(groups, activeId): void {
      const visible = groups.filter((group) => group.entries.length > 0)
      const key = structureKey(visible)
      if (key !== renderedKey) {
        renderedKey = key
        rebuild(visible)
      }
      // In-place update: selection, roving tab stop and counts change without touching the rest.
      const entries = visible.flatMap((group) => group.entries)
      let hasStop = false
      rendered.forEach((item, index) => {
        const entry = entries[index]
        const active = entry?.id === activeId
        const current = active ? 'page' : 'false'
        if (item.button.getAttribute('aria-current') !== current)
          item.button.setAttribute('aria-current', current)
        // Roving focus: Tab enters the sidebar once; arrows move within it.
        item.button.tabIndex = active ? 0 : -1
        hasStop ||= active
        const count = entry?.count === undefined ? '' : String(entry.count)
        if (item.count.textContent !== count) item.count.textContent = count
      })
      if (!hasStop && rendered[0]) rendered[0].button.tabIndex = 0
    },
    onSelect(listener): void {
      select = listener
    },
  }
}
