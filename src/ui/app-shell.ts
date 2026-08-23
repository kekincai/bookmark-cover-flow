import { createBookmarkMeta, type BookmarkMetaView } from './components/bookmark-meta'
import { createCoverFlow, type CoverFlowView } from './components/cover-flow'
import { createFolderNavigation, type FolderNavigationView } from './components/folder-navigation'
import { createSearchBox, type SearchBoxView } from './components/search-box'
import { createPreferencesMenu, type PreferencesMenuView } from './components/preferences-menu'

export interface AppShell {
  readonly element: HTMLElement
  readonly folders: FolderNavigationView
  readonly search: SearchBoxView
  readonly preferences: PreferencesMenuView
  readonly coverFlow: CoverFlowView
  readonly meta: BookmarkMetaView
  setStatus(message: string | undefined): void
}

export function createAppShell(): AppShell {
  const element = document.createElement('main')
  element.className = 'app-shell'
  const header = document.createElement('header')
  header.className = 'app-header'
  const folders = createFolderNavigation()
  const brand = document.createElement('div')
  brand.className = 'app-brand'
  brand.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.5 5.5c2.7-1.2 5.4-.9 8.5.9v13c-3.1-1.8-5.8-2.1-8.5-.9z" />
      <path d="M20.5 5.5c-2.7-1.2-5.4-.9-8.5.9v13c3.1-1.8 5.8-2.1 8.5-.9z" />
    </svg>
    <span>Bookmarks</span>
  `
  const search = createSearchBox()
  const preferences = createPreferencesMenu()
  const tools = document.createElement('div')
  tools.className = 'app-header__tools'
  tools.append(search.element, preferences.element)
  header.append(folders.backElement, brand, folders.element, tools)

  const coverFlow = createCoverFlow()
  const meta = createBookmarkMeta()
  const hint = document.createElement('p')
  hint.className = 'interaction-hint'
  hint.innerHTML =
    'Use <kbd>←</kbd> <kbd>→</kbd> to browse <span class="interaction-hint__secondary"><i>·</i> <kbd>Enter</kbd> to open <i>·</i> <kbd>/</kbd> to search</span>'
  const status = document.createElement('p')
  status.className = 'app-status'
  status.setAttribute('role', 'status')

  element.append(header, coverFlow.element, meta.element, hint, status)

  return {
    element,
    folders,
    search,
    preferences,
    coverFlow,
    meta,
    setStatus(message): void {
      status.textContent = message ?? ''
      status.hidden = message === undefined
    },
  }
}
