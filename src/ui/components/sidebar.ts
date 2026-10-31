import type { BookmarkFolder } from '../../domain/bookmark'
import { t } from '../../shared/i18n'
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
  settingsButton.innerHTML = icons.gear
  const note = document.createElement('span')
  note.className = 'sidebar__note'
  note.textContent = t('localOnly')
  footer.append(settingsButton, note)
  element.append(search.element, groupsElement, footer)

  let select: (id: string) => void = () => undefined
  const items = (): HTMLButtonElement[] =>
    Array.from(groupsElement.querySelectorAll<HTMLButtonElement>('.sidebar-item'))

  // Arrow keys move between sources here and never reach the cover flow.
  groupsElement.addEventListener('keydown', (event) => {
    const list = items()
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

  return {
    element,
    search,
    settingsButton,
    render(groups, activeId): void {
      const focusedId = (document.activeElement as HTMLElement | null)?.dataset?.sourceId
      groupsElement.replaceChildren(
        ...groups
          .filter((group) => group.entries.length > 0)
          .map((group) => {
            const section = document.createElement('section')
            section.className = 'sidebar__group'
            const heading = document.createElement('h2')
            heading.className = 'sidebar__heading'
            heading.textContent = group.title
            section.append(heading)
            for (const entry of group.entries) {
              const button = document.createElement('button')
              button.type = 'button'
              button.className = 'sidebar-item'
              button.dataset.sourceId = entry.id
              button.style.setProperty('--depth', String(entry.depth))
              const active = entry.id === activeId
              button.setAttribute('aria-current', active ? 'page' : 'false')
              // Roving focus: Tab enters the sidebar once; arrows move within it.
              button.tabIndex = active ? 0 : -1
              button.innerHTML = `${icons[entry.icon]}<span class="sidebar-item__title"></span><span class="sidebar-item__count"></span>`
              button.querySelector('.sidebar-item__title')!.textContent = entry.title
              button.querySelector('.sidebar-item__count')!.textContent =
                entry.count === undefined ? '' : String(entry.count)
              button.addEventListener('click', () => select(entry.id))
              section.append(button)
            }
            return section
          }),
      )
      const rendered = items()
      if (!rendered.some((item) => item.tabIndex === 0) && rendered[0]) rendered[0].tabIndex = 0
      if (focusedId !== undefined)
        rendered.find((item) => item.dataset.sourceId === focusedId)?.focus({ preventScroll: true })
    },
    onSelect(listener): void {
      select = listener
    },
  }
}
