import { loadBookmarks } from '../application/load-bookmarks'
import { openBookmark } from '../application/open-bookmark'
import { resolveCovers } from '../application/resolve-cover'
import { searchBookmarks } from '../application/search-bookmarks'
import { selectBookmark } from '../application/select-bookmark'
import type { NavigationCommand } from '../domain/navigation'
import { createBookmarkRepository } from '../infrastructure/chrome/bookmark-repository'
import { loadPreferences, savePreferences } from '../infrastructure/chrome/storage-service'
import { createTabService } from '../infrastructure/chrome/tab-service'
import { createAppShell } from '../ui/app-shell'
import { attachKeyboardController } from '../ui/controllers/keyboard-controller'
import { createMotionController } from '../ui/controllers/motion-controller'
import { attachPointerController } from '../ui/controllers/pointer-controller'
import { attachWheelController } from '../ui/controllers/wheel-controller'
import { createStore, type AppState } from '../ui/state/app-store'

const initialState: AppState = {
  folders: [],
  covers: [],
  visibleCovers: [],
  selectedIndex: 0,
  query: '',
  isSearching: false,
  status: 'loading',
}

export async function bootstrap(root: HTMLElement): Promise<() => void> {
  const shell = createAppShell()
  root.replaceChildren(shell.element)
  const store = createStore(initialState)
  const repository = createBookmarkRepository()
  const tabService = createTabService()
  let previousFolderId: string | undefined
  let previousVisibleCovers = store.value.visibleCovers

  const motion = createMotionController(
    (position) => {
      shell.coverFlow.render(position)
      const item = store.value.visibleCovers[Math.round(position)]
      shell.meta.render(item, store.value.query === '' ? 'No bookmarks here' : 'No results found')
    },
    (selectedIndex) => {
      if (selectedIndex === store.value.selectedIndex) return
      store.update((state) => ({ ...state, selectedIndex }))
    },
  )

  const setFolder = (folderId: string, persist = true): void => {
    const folder = store.value.folders.find((candidate) => candidate.id === folderId)
    if (folder === undefined) return
    const covers = resolveCovers(folder.children)
    store.update((state) => ({
      ...state,
      activeFolderId: folder.id,
      covers,
      visibleCovers: searchBookmarks(covers, state.query),
      selectedIndex: 0,
      status: covers.length === 0 ? 'empty' : 'ready',
    }))
    if (persist) void savePreferences({ activeFolderId: folder.id })
  }

  const setQuery = (query: string): void => {
    const visibleCovers = searchBookmarks(store.value.covers, query)
    store.update((state) => ({
      ...state,
      query,
      isSearching: query !== '',
      visibleCovers,
      selectedIndex: 0,
      status: visibleCovers.length === 0 ? 'empty' : 'ready',
    }))
  }

  const dispatch = (command: NavigationCommand): void => {
    const count = store.value.visibleCovers.length
    if (command.type === 'search') {
      setQuery(command.query)
      return
    }
    if (command.type === 'next') motion.moveTarget(1)
    if (command.type === 'previous') motion.moveTarget(-1)
    if (command.type === 'move') motion.moveTarget(command.delta)
    if (command.type === 'first') motion.setTarget(0)
    if (command.type === 'last') motion.setTarget(Math.max(0, count - 1))
    if (command.type === 'open') {
      const item = store.value.visibleCovers[Math.round(motion.position)]
      if (item !== undefined) {
        void openBookmark(tabService, item.url).catch((error: unknown) => {
          shell.setStatus(error instanceof Error ? error.message : 'Unable to open bookmark')
        })
      }
    }
  }

  const activateCover = (index: number): void => {
    if (Math.round(motion.position) === index) dispatch({ type: 'open' })
    else motion.setTarget(index)
  }

  shell.folders.onSelect(setFolder)
  shell.search.onSearch((query) => dispatch({ type: 'search', query }))
  shell.coverFlow.onActivate(activateCover)

  const cleanups = [
    attachKeyboardController(dispatch, shell.search.input),
    attachWheelController(shell.coverFlow.element, dispatch),
    attachPointerController(shell.coverFlow.element, motion, activateCover),
  ]

  cleanups.push(
    store.subscribe((state) => {
      shell.folders.render(state.folders, state.activeFolderId)
      if (state.activeFolderId !== previousFolderId || state.visibleCovers !== previousVisibleCovers) {
        shell.coverFlow.setItems(state.visibleCovers)
        motion.setItemCount(state.visibleCovers.length)
        motion.setTarget(selectBookmark(state.selectedIndex, state.visibleCovers.length), true)
        previousFolderId = state.activeFolderId
        previousVisibleCovers = state.visibleCovers
      }
      shell.setStatus(state.status === 'loading' ? 'Loading bookmarks…' : state.errorMessage)
    }),
  )

  try {
    const [folders, preferences] = await Promise.all([loadBookmarks(repository), loadPreferences()])
    const preferredFolder = folders.find((folder) => folder.id === preferences.activeFolderId) ?? folders[0]
    store.update((state) => ({
      ...state,
      folders,
      status: preferredFolder === undefined ? 'empty' : 'ready',
    }))
    if (preferredFolder !== undefined) setFolder(preferredFolder.id, false)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to load Chrome bookmarks.'
    store.update((state) => ({ ...state, status: 'error', errorMessage: message }))
  }

  return () => {
    cleanups.forEach((cleanup) => cleanup())
    motion.destroy()
  }
}
