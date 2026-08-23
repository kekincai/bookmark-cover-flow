import type { BookmarkFolder } from '../../domain/bookmark'
import { RECENT_COLLECTION_ID } from '../../domain/recent-bookmark'

export interface FolderNavigationView {
  readonly element: HTMLElement
  readonly backElement: HTMLButtonElement
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
  const backElement = document.createElement('button')
  backElement.type = 'button'
  backElement.className = 'folder-navigation__back'
  backElement.innerHTML =
    '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m12.5 4.5-5 5.5 5 5.5"/></svg>'
  let select: (folderId: string) => void = () => undefined

  const appendSeparator = (kind = 'path'): void => {
    const separator = document.createElement('span')
    separator.className = `folder-navigation__separator folder-navigation__separator--${kind}`
    separator.textContent = kind === 'path' ? '/' : ''
    separator.setAttribute('aria-hidden', 'true')
    element.append(separator)
  }

  const appendFolder = (folder: BookmarkFolder, className = ''): void => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `folder-navigation__item ${className}`.trim()
    button.textContent = folder.title
    button.dataset.active = String(folder.id === currentActiveFolderId)
    button.setAttribute('aria-current', folder.id === currentActiveFolderId ? 'page' : 'false')
    button.addEventListener('click', () => select(folder.id))
    element.append(button)
  }

  let currentActiveFolderId: string | undefined

  return {
    element,
    backElement,
    render(rootFolders, breadcrumbs, activeFolderId): void {
      element.replaceChildren()
      currentActiveFolderId = activeFolderId
      const activeFolder = breadcrumbs.at(-1)
      const parentFolder = breadcrumbs.at(-2)

      backElement.disabled = parentFolder === undefined
      backElement.dataset.visible = String(parentFolder !== undefined)
      backElement.setAttribute(
        'aria-label',
        parentFolder === undefined ? 'No parent folder' : `Back to ${parentFolder.title}`,
      )
      backElement.onclick = parentFolder === undefined ? null : () => select(parentFolder.id)

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
        if (rootFolders.length > 0) appendSeparator('branch')
      }

      const folders = parentFolder === undefined ? rootFolders : breadcrumbs
      folders.forEach((folder, index) => {
        if (index > 0) appendSeparator()
        appendFolder(folder)
      })

      if (activeFolder !== undefined && activeFolder.folders.length > 0) {
        appendSeparator('branch')
        activeFolder.folders.forEach((folder) => {
          appendFolder(folder, 'folder-navigation__child')
        })
      }
    },
    onSelect(listener): void {
      select = listener
    },
  }
}
