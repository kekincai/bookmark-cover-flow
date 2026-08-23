import type { BookmarkFolder } from '../../domain/bookmark'
import { RECENT_COLLECTION_ID } from '../../domain/recent-bookmark'

export interface FolderNavigationView {
  readonly element: HTMLElement
  render(
    rootFolders: readonly BookmarkFolder[],
    breadcrumbs: readonly BookmarkFolder[],
    activeFolderId: string | undefined,
  ): void
  onSelect(listener: (folderId: string) => void): void
}

export function createFolderNavigation(): FolderNavigationView {
  const element = document.createElement('nav')
  element.className = 'folder-navigation'
  element.setAttribute('aria-label', 'Bookmark folders')
  let select: (folderId: string) => void = () => undefined

  return {
    element,
    render(rootFolders, breadcrumbs, activeFolderId): void {
      element.replaceChildren()
      const activeFolder = breadcrumbs.at(-1)
      const parentFolder = breadcrumbs.at(-2)

      if (parentFolder === undefined) {
        const recent = document.createElement('button')
        recent.type = 'button'
        recent.className = 'folder-navigation__item folder-navigation__recent'
        recent.textContent = 'Recent'
        recent.dataset.active = String(activeFolderId === RECENT_COLLECTION_ID)
        recent.setAttribute(
          'aria-current',
          activeFolderId === RECENT_COLLECTION_ID ? 'page' : 'false',
        )
        recent.addEventListener('click', () => select(RECENT_COLLECTION_ID))
        element.append(recent)

        const recentSeparator = document.createElement('span')
        recentSeparator.className = 'folder-navigation__separator'
        recentSeparator.setAttribute('aria-hidden', 'true')
        element.append(recentSeparator)
      }

      if (parentFolder !== undefined) {
        const back = document.createElement('button')
        back.type = 'button'
        back.className = 'folder-navigation__back'
        back.setAttribute('aria-label', `Back to ${parentFolder.title}`)
        back.innerHTML =
          '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m12.5 4.5-5 5.5 5 5.5"/></svg>'
        back.addEventListener('click', () => select(parentFolder.id))
        element.append(back)
      }

      const folders = parentFolder === undefined ? rootFolders : breadcrumbs
      folders.forEach((folder) => {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'folder-navigation__item'
        button.textContent = folder.title
        button.dataset.active = String(folder.id === activeFolderId)
        button.setAttribute('aria-current', folder.id === activeFolderId ? 'page' : 'false')
        button.addEventListener('click', () => select(folder.id))
        element.append(button)
      })

      if (activeFolder !== undefined && activeFolder.folders.length > 0) {
        const separator = document.createElement('span')
        separator.className = 'folder-navigation__separator'
        separator.setAttribute('aria-hidden', 'true')
        element.append(separator)
        activeFolder.folders.forEach((folder) => {
          const button = document.createElement('button')
          button.type = 'button'
          button.className = 'folder-navigation__item folder-navigation__child'
          button.textContent = folder.title
          button.dataset.active = 'false'
          button.addEventListener('click', () => select(folder.id))
          element.append(button)
        })
      }
    },
    onSelect(listener): void {
      select = listener
    },
  }
}
