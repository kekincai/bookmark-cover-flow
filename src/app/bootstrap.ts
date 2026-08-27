import { loadBookmarks } from '../application/load-bookmarks'
import {
  findFirstUsableFolder,
  findFolder,
  getFolderBreadcrumbs,
} from '../application/bookmark-folders'
import { openBookmark } from '../application/open-bookmark'
import { applyPreviewImage, preloadBookmarkPreviews } from '../application/preview-bookmarks'
import { resolveCovers } from '../application/resolve-cover'
import { searchBookmarks } from '../application/search-bookmarks'
import { selectBookmark } from '../application/select-bookmark'
import { sortBookmarks } from '../application/sort-bookmarks'
import type { Bookmark } from '../domain/bookmark'
import type { NavigationCommand } from '../domain/navigation'
import { defaultPreferences, type Preferences } from '../domain/preferences'
import { RECENT_COLLECTION_ID } from '../domain/recent-bookmark'
import { createBookmarkRepository } from '../infrastructure/chrome/bookmark-repository'
import { createPreviewProvider } from '../infrastructure/chrome/preview-provider'
import {
  loadRecentBookmarks,
  recordRecentBookmark,
} from '../infrastructure/chrome/recent-bookmark-service'
import { loadPreferences, savePreferences } from '../infrastructure/chrome/storage-service'
import { createTabService } from '../infrastructure/chrome/tab-service'
import { createAppShell } from '../ui/app-shell'
import { attachKeyboardController } from '../ui/controllers/keyboard-controller'
import { createMotionController } from '../ui/controllers/motion-controller'
import { attachPointerController } from '../ui/controllers/pointer-controller'
import { attachWheelController } from '../ui/controllers/wheel-controller'
import { createWallpaperController } from '../ui/controllers/wallpaper-controller'
import { createStore, type AppState } from '../ui/state/app-store'
import { t } from '../shared/i18n'

const initialState: AppState = {
  folders: [],
  covers: [],
  visibleCovers: [],
  selectedIndex: 0,
  query: '',
  isSearching: false,
  recentBookmarks: [],
  ...defaultPreferences,
  status: 'loading',
}

function applyAppearance(preferences: Preferences): void {
  if (preferences.theme === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = preferences.theme
  document.documentElement.dataset.reflection = String(preferences.showReflection)
}

export async function bootstrap(root: HTMLElement): Promise<() => void> {
  const shell = createAppShell()
  root.replaceChildren(shell.element)
  const wallpaper = createWallpaperController(shell.preferences.wallpaper)
  void wallpaper.init()
  const store = createStore(initialState)
  const repository = createBookmarkRepository()
  const previewProvider = createPreviewProvider()
  const tabService = createTabService()
  let previousFolderId: string | undefined
  let previousFolders = store.value.folders
  let previousVisibleCovers = store.value.visibleCovers
  let previewGeneration = 0
  let requestedPreviewIds = new Set<string>()
  let requestVisiblePreviews: (index: number) => void = () => undefined

  const persistPreferences = (preferences: Preferences): void => {
    void savePreferences(preferences).catch((error: unknown) => {
      console.warn('Unable to save view preferences.', error)
    })
  }

  const motion = createMotionController(
    (position) => {
      shell.coverFlow.render(position)
      const item = store.value.visibleCovers[Math.round(position)]
      const emptyMessage =
        store.value.query !== ''
          ? t('noResults')
          : store.value.activeFolderId === RECENT_COLLECTION_ID
            ? t('noRecent')
            : t('noBookmarks')
      shell.meta.render(item, emptyMessage)
    },
    (selectedIndex) => {
      requestVisiblePreviews(selectedIndex)
      if (selectedIndex === store.value.selectedIndex) return
      store.update((state) => ({ ...state, selectedIndex }))
    },
  )

  const setCollection = (folderId: string, persist = true): void => {
    const state = store.value
    const folder = findFolder(state.folders, folderId)
    if (folder === undefined && folderId !== RECENT_COLLECTION_ID) return
    previewGeneration += 1
    requestedPreviewIds = new Set()
    const bookmarks: readonly Bookmark[] =
      folderId === RECENT_COLLECTION_ID ? state.recentBookmarks : (folder?.children ?? [])
    const recentOpenedAt = new Map(
      state.recentBookmarks.map((bookmark) => [bookmark.id, bookmark.openedAt]),
    )
    const covers = resolveCovers(sortBookmarks(bookmarks, state.sortMode, recentOpenedAt))
    store.update((state) => ({
      ...state,
      activeFolderId: folderId,
      covers,
      visibleCovers: searchBookmarks(covers, state.query),
      selectedIndex: 0,
      status: covers.length === 0 ? 'empty' : 'ready',
    }))
    requestVisiblePreviews(0)
    if (persist) {
      persistPreferences({
        activeFolderId: folderId,
        sortMode: store.value.sortMode,
        theme: store.value.theme,
        showReflection: store.value.showReflection,
      })
    }
  }

  requestVisiblePreviews = (index): void => {
    const generation = previewGeneration
    const covers = store.value.visibleCovers
    const first = Math.max(0, index - 8)
    const candidates = covers.slice(first, Math.min(covers.length, index + 9)).filter((item) => {
      if (requestedPreviewIds.has(item.bookmarkId)) return false
      requestedPreviewIds.add(item.bookmarkId)
      return true
    })
    if (candidates.length === 0) return

    void preloadBookmarkPreviews(
      candidates,
      previewProvider,
      (bookmarkId, imageUrl) => {
        store.update((state) => {
          if (generation !== previewGeneration) return state
          const covers = state.covers.map((item) =>
            item.bookmarkId === bookmarkId ? applyPreviewImage(item, imageUrl) : item,
          )
          return {
            ...state,
            covers,
            visibleCovers: searchBookmarks(covers, state.query),
          }
        })
      },
      () => generation === previewGeneration,
    )
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
    requestVisiblePreviews(0)
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
    if (command.type === 'page-previous') motion.moveTarget(-5)
    if (command.type === 'page-next') motion.moveTarget(5)
    if (command.type === 'open') {
      const item = store.value.visibleCovers[Math.round(motion.position)]
      if (item !== undefined) {
        void openBookmark(tabService, item.url)
          .then(async () => {
            const recentBookmarks = await recordRecentBookmark({
              id: item.bookmarkId,
              title: item.title,
              url: item.url,
            })
            store.update((state) => ({ ...state, recentBookmarks }))
            const activeFolderId = store.value.activeFolderId
            if (
              activeFolderId !== undefined &&
              (activeFolderId === RECENT_COLLECTION_ID || store.value.sortMode === 'recent')
            ) {
              setCollection(activeFolderId, false)
            }
          })
          .catch((error: unknown) => {
            console.warn('Unable to open bookmark', error)
            shell.setStatus(t('openFailed'))
          })
      }
    }
  }

  const activateCover = (index: number): void => {
    if (Math.round(motion.position) === index) dispatch({ type: 'open' })
    else motion.setTarget(index)
  }

  shell.folders.onSelect(setCollection)
  shell.search.onSearch((query) => dispatch({ type: 'search', query }))
  shell.preferences.onChange((change) => {
    const current = store.value
    const preferences: Preferences = {
      ...(current.activeFolderId === undefined ? {} : { activeFolderId: current.activeFolderId }),
      sortMode: change.sortMode ?? current.sortMode,
      theme: change.theme ?? current.theme,
      showReflection: change.showReflection ?? current.showReflection,
    }
    store.update((state) => ({ ...state, ...preferences }))
    applyAppearance(preferences)
    persistPreferences(preferences)
    if (change.sortMode !== undefined && current.activeFolderId !== undefined) {
      setCollection(current.activeFolderId, false)
    }
  })
  shell.coverFlow.onActivate(activateCover)

  const cleanups = [
    attachKeyboardController(dispatch, shell.search.input),
    attachWheelController(shell.coverFlow.element, motion),
    attachPointerController(shell.coverFlow.element, motion),
  ]

  cleanups.push(
    store.subscribe((state) => {
      if (state.activeFolderId !== previousFolderId || state.folders !== previousFolders)
        shell.folders.render(
          state.folders,
          getFolderBreadcrumbs(state.folders, state.activeFolderId),
          state.activeFolderId,
        )
      shell.preferences.render(state)
      previousFolders = state.folders
      if (
        state.activeFolderId !== previousFolderId ||
        state.visibleCovers !== previousVisibleCovers
      ) {
        const preservesSelection =
          state.activeFolderId === previousFolderId &&
          state.visibleCovers.length === previousVisibleCovers.length &&
          state.visibleCovers.every(
            (item, index) => item.bookmarkId === previousVisibleCovers[index]?.bookmarkId,
          )
        shell.coverFlow.setItems(state.visibleCovers)
        motion.setItemCount(state.visibleCovers.length)
        if (!preservesSelection) {
          motion.setTarget(selectBookmark(state.selectedIndex, state.visibleCovers.length), true)
        } else {
          shell.coverFlow.render(motion.position)
        }
        previousFolderId = state.activeFolderId
        previousVisibleCovers = state.visibleCovers
      }
      shell.setStatus(state.status === 'loading' ? t('loadingBookmarks') : state.errorMessage)
    }),
  )

  try {
    const [folders, preferences, recentBookmarks] = await Promise.all([
      loadBookmarks(repository),
      loadPreferences(),
      loadRecentBookmarks(),
    ])
    applyAppearance(preferences)
    const preferredFolder = findFolder(folders, preferences.activeFolderId)
    const preferredFolderId =
      preferences.activeFolderId === RECENT_COLLECTION_ID
        ? RECENT_COLLECTION_ID
        : (preferredFolder ?? findFirstUsableFolder(folders))?.id
    store.update((state) => ({
      ...state,
      folders,
      recentBookmarks,
      ...preferences,
      status: preferredFolderId === undefined ? 'empty' : 'ready',
    }))
    if (preferredFolderId !== undefined) setCollection(preferredFolderId, false)
  } catch (error: unknown) {
    console.warn('Unable to load Chrome bookmarks.', error)
    const message = t('bookmarksFailed')
    store.update((state) => ({ ...state, status: 'error', errorMessage: message }))
  }

  return () => {
    cleanups.forEach((cleanup) => cleanup())
    wallpaper.destroy()
    shell.preferences.destroy()
    shell.coverFlow.destroy()
    motion.destroy()
  }
}
