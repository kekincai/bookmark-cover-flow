import type { BookmarkFolder } from '../../domain/bookmark'

export interface FolderNavigationView {
  readonly element: HTMLElement
  render(folders: readonly BookmarkFolder[], activeFolderId: string | undefined): void
  onSelect(listener: (folderId: string) => void): void
}

export function createFolderNavigation(): FolderNavigationView {
  const element = document.createElement('nav')
  element.className = 'folder-navigation'
  element.setAttribute('aria-label', 'Bookmark folders')
  let select: (folderId: string) => void = () => undefined

  return {
    element,
    render(folders, activeFolderId): void {
      element.replaceChildren()
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
    },
    onSelect(listener): void {
      select = listener
    },
  }
}
