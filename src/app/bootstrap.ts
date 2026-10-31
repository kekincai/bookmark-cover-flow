import { loadBookmarks } from '../application/load-bookmarks'
import {
  fileBookmarks,
  findFolder,
  folderTitleIndex,
  listAllBookmarks,
  listRecentlyAdded,
} from '../application/bookmark-folders'
import { openBookmark } from '../application/open-bookmark'
import {
  applyPreview,
  preloadBookmarkPreviews,
  type PreviewResult,
} from '../application/preview-bookmarks'
import { applySiteColor, resolveCovers, type FiledBookmark } from '../application/resolve-cover'
import { searchBookmarks } from '../application/search-bookmarks'
import { selectBookmark } from '../application/select-bookmark'
import { sortBookmarks } from '../application/sort-bookmarks'
import {
  ADDED_COLLECTION_ID,
  ALL_COLLECTION_ID,
  RECENT_COLLECTION_ID,
  RECENTLY_ADDED_LIMIT,
} from '../domain/collection'
import type { CoverItem } from '../domain/cover'
import type { NavigationCommand } from '../domain/navigation'
import { defaultPreferences, type Preferences } from '../domain/preferences'
import { createBookmarkRepository } from '../infrastructure/chrome/bookmark-repository'
import { createPreviewCacheService } from '../infrastructure/chrome/preview-cache-service'
import { createPreviewProvider } from '../infrastructure/chrome/preview-provider'
import {
  clearRecentBookmarks,
  loadRecentBookmarks,
  recordRecentBookmark,
} from '../infrastructure/chrome/recent-bookmark-service'
import { loadPreferences, savePreferences } from '../infrastructure/chrome/storage-service'
import { createTabService } from '../infrastructure/chrome/tab-service'
import { readFaviconColor } from '../infrastructure/favicon-color'
import { createAppShell } from '../ui/app-shell'
import { createPreferencesMenu } from '../ui/components/preferences-menu'
import { folderEntries, type SidebarGroup } from '../ui/components/sidebar'
import type { StageState } from '../ui/components/stage-status'
import { attachKeyboardController } from '../ui/controllers/keyboard-controller'
import { createMotionController } from '../ui/controllers/motion-controller'
import { attachPointerController } from '../ui/controllers/pointer-controller'
import { createWallpaperController } from '../ui/controllers/wallpaper-controller'
import { attachWheelController } from '../ui/controllers/wheel-controller'
import { createStore, type AppState } from '../ui/state/app-store'
import { t } from '../shared/i18n'

const PREVIEW_RADIUS = 8

const initialState: AppState = {
  folders: [],
  covers: [],
  visibleCovers: [],
  selectedIndex: 0,
  query: '',
  recentBookmarks: [],
  ...defaultPreferences,
  status: 'loading',
}

const preferencesOf = (state: AppState): Preferences => ({
  ...(state.activeFolderId === undefined ? {} : { activeFolderId: state.activeFolderId }),
  sortMode: state.sortMode,
  theme: state.theme,
  showReflection: state.showReflection,
  preferPreviewImages: state.preferPreviewImages,
  coverAngle: state.coverAngle,
  reduceFlipMotion: state.reduceFlipMotion,
})

function applyAppearance(preferences: Preferences): void {
  const root = document.documentElement
  if (preferences.theme === 'system') delete root.dataset.theme
  else root.dataset.theme = preferences.theme
  root.dataset.reflection = String(preferences.showReflection)
  root.dataset.reduceFlip = String(preferences.reduceFlipMotion)
}

function collectionTitle(state: AppState): string {
  const id = state.activeFolderId
  if (id === ALL_COLLECTION_ID) return t('allBookmarks')
  if (id === RECENT_COLLECTION_ID) return t('recent')
  if (id === ADDED_COLLECTION_ID) return t('recentlyAdded')
  return findFolder(state.folders, id)?.title ?? t('allBookmarks')
}

function collectionBookmarks(state: AppState, id: string): readonly FiledBookmark[] | undefined {
  if (id === ALL_COLLECTION_ID) return listAllBookmarks(state.folders)
  if (id === ADDED_COLLECTION_ID)
    return listRecentlyAdded(listAllBookmarks(state.folders), RECENTLY_ADDED_LIMIT)
  if (id === RECENT_COLLECTION_ID) {
    const folders = folderTitleIndex(listAllBookmarks(state.folders))
    return state.recentBookmarks.map((bookmark) => ({
      ...bookmark,
      folderTitle: folders.get(bookmark.id) ?? folders.get(bookmark.url) ?? '',
    }))
  }
  const folder = findFolder(state.folders, id)
  return folder === undefined ? undefined : fileBookmarks(folder)
}

function sidebarGroups(state: AppState): readonly SidebarGroup[] {
  const all = listAllBookmarks(state.folders)
  return [
    {
      title: t('library'),
      entries: [
        {
          id: ALL_COLLECTION_ID,
          title: t('allBookmarks'),
          count: all.length,
          icon: 'library',
          depth: 0,
        },
        {
          id: RECENT_COLLECTION_ID,
          title: t('recent'),
          count: state.recentBookmarks.length,
          icon: 'recent',
          depth: 0,
        },
        {
          id: ADDED_COLLECTION_ID,
          title: t('recentlyAdded'),
          count: listRecentlyAdded(all, RECENTLY_ADDED_LIMIT).length,
          icon: 'added',
          depth: 0,
        },
      ],
    },
    ...state.folders.map((root) => ({ title: root.title, entries: folderEntries(root) })),
  ]
}

function stageState(state: AppState): StageState {
  if (state.status === 'loading') return { kind: 'loading' }
  if (state.status === 'error') return { kind: 'error' }
  if (state.visibleCovers.length > 0) return { kind: 'ready' }
  if (state.query.trim() !== '') return { kind: 'no-results', query: state.query.trim() }
  if (state.activeFolderId === RECENT_COLLECTION_ID)
    return { kind: 'empty', title: t('noRecent'), detail: t('noRecentHint') }
  return { kind: 'empty', title: t('noBookmarks'), detail: t('tryFolder') }
}

const countText = (state: AppState): string => {
  const count = state.visibleCovers.length
  const query = state.query.trim()
  if (query !== '')
    return count === 1 ? t('matchCountOne', query) : t('matchCount', String(count), query)
  return count === 1 ? t('bookmarkCountOne') : t('bookmarkCount', String(count))
}

export async function bootstrap(root: HTMLElement): Promise<() => void> {
  const shell = createAppShell()
  root.replaceChildren(shell.element)
  document.body.append(shell.fullscreen.element)
  const store = createStore(initialState)
  const repository = createBookmarkRepository()
  const previewProvider = createPreviewProvider()
  const tabService = createTabService()
  const preferencesMenu = createPreferencesMenu({
    trigger: shell.sidebar.settingsButton,
    previewCache: createPreviewCacheService(),
    clearRecent: async () => {
      await clearRecentBookmarks()
      store.update((state) => ({ ...state, recentBookmarks: [] }))
      if (store.value.activeFolderId === RECENT_COLLECTION_ID)
        setCollection(RECENT_COLLECTION_ID, false)
    },
  })
  const wallpaper = createWallpaperController(preferencesMenu.wallpaper, shell.stage)
  void wallpaper.init()

  /** Learned this session: a site's theme color, else its favicon's dominant color. */
  const siteColors = new Map<string, string>()
  let previewGeneration = 0
  let requestedPreviewIds = new Set<string>()
  let pendingPatches = new Map<string, (item: CoverItem) => CoverItem>()
  let patchFrame = 0
  let previous: AppState | undefined

  const persistPreferences = (): void => {
    void savePreferences(preferencesOf(store.value)).catch((error: unknown) => {
      console.warn('Unable to save view preferences.', error)
    })
  }

  const renderPosition = (position: number): void => {
    const state = store.value
    const items = state.visibleCovers
    shell.coverFlow.render(position)
    shell.meta.render(items[Math.round(position)])
    shell.scrubber.render(position, items.length)
    shell.list.setSelected(Math.round(position))
    shell.fullscreen.render(position, items, collectionTitle(state))
  }

  const motion = createMotionController(
    renderPosition,
    (selectedIndex) => {
      requestVisiblePreviews(selectedIndex)
      if (selectedIndex === store.value.selectedIndex) return
      store.update((state) => ({ ...state, selectedIndex }))
    },
    () => store.value.reduceFlipMotion,
    () => {
      shell.coverFlow.crossFade()
      if (shell.fullscreen.isOpen) shell.fullscreen.coverFlow.crossFade()
    },
  )

  /** Many previews arrive per flip; fold them into one store update per frame. */
  const patchCover = (bookmarkId: string, patch: (item: CoverItem) => CoverItem): void => {
    const existing = pendingPatches.get(bookmarkId)
    pendingPatches.set(bookmarkId, existing ? (item) => patch(existing(item)) : patch)
    if (patchFrame !== 0) return
    patchFrame = requestAnimationFrame(() => {
      patchFrame = 0
      const patches = pendingPatches
      pendingPatches = new Map()
      store.update((state) => {
        const covers = state.covers.map((item) => patches.get(item.bookmarkId)?.(item) ?? item)
        return { ...state, covers, visibleCovers: searchBookmarks(covers, state.query) }
      })
    })
  }

  const colorFromFavicon = (item: CoverItem, generation: number): void => {
    if (item.favicon === undefined || siteColors.has(item.subtitle)) return
    void readFaviconColor(item.favicon).then((color) => {
      if (color === undefined || generation !== previewGeneration) return
      if (!siteColors.has(item.subtitle)) siteColors.set(item.subtitle, color)
      patchCover(item.bookmarkId, (current) =>
        applySiteColor(current, siteColors.get(item.subtitle)!),
      )
    })
  }

  const requestVisiblePreviews = (index: number): void => {
    const generation = previewGeneration
    const covers = store.value.visibleCovers
    const candidates = covers
      .slice(
        Math.max(0, index - PREVIEW_RADIUS),
        Math.min(covers.length, index + PREVIEW_RADIUS + 1),
      )
      .filter((item) => {
        if (requestedPreviewIds.has(item.bookmarkId)) return false
        requestedPreviewIds.add(item.bookmarkId)
        return true
      })
    if (candidates.length === 0) return
    const known = candidates.filter((item) => siteColors.has(item.subtitle))
    known.forEach((item) =>
      patchCover(item.bookmarkId, (current) =>
        applySiteColor(current, siteColors.get(item.subtitle)!),
      ),
    )
    const pending = candidates.filter((item) => item.imageKind === 'pending')
    candidates
      .filter((item) => item.imageKind !== 'pending')
      .forEach((item) => colorFromFavicon(item, generation))
    if (pending.length === 0) return
    void preloadBookmarkPreviews(
      pending,
      previewProvider,
      (bookmarkId, result: PreviewResult) => {
        const item = pending.find((candidate) => candidate.bookmarkId === bookmarkId)
        if (item && result.themeColor !== undefined)
          siteColors.set(item.subtitle, result.themeColor)
        patchCover(bookmarkId, (current) => applyPreview(current, result))
        if (item && result.themeColor === undefined) colorFromFavicon(item, generation)
      },
      () => generation === previewGeneration,
    )
  }

  const setCollection = (collectionId: string, persist = true): void => {
    const state = store.value
    const bookmarks = collectionBookmarks(state, collectionId)
    if (bookmarks === undefined) return
    previewGeneration += 1
    requestedPreviewIds = new Set()
    const recentOpenedAt = new Map(
      state.recentBookmarks.map((bookmark) => [bookmark.id, bookmark.openedAt]),
    )
    const covers = resolveCovers(sortBookmarks(bookmarks, state.sortMode, recentOpenedAt), {
      preferPreview: state.preferPreviewImages,
      siteColors,
    })
    store.update((current) => ({
      ...current,
      activeFolderId: collectionId,
      covers,
      visibleCovers: searchBookmarks(covers, current.query),
      selectedIndex: 0,
      status: 'ready',
    }))
    requestVisiblePreviews(0)
    if (persist) persistPreferences()
  }

  const setQuery = (query: string): void => {
    store.update((state) => ({
      ...state,
      query,
      visibleCovers: searchBookmarks(state.covers, query),
      selectedIndex: 0,
    }))
    requestVisiblePreviews(0)
  }

  const openItem = (item: CoverItem | undefined, background = false): void => {
    if (item === undefined) return
    void openBookmark(tabService, item.url, { background })
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
      .catch((error: unknown) => console.warn(t('openFailed'), error))
  }

  const openCurrent = (background = false): void => {
    const item = store.value.visibleCovers[Math.round(motion.position)]
    if (item === undefined) return
    ;(shell.fullscreen.isOpen ? shell.fullscreen.coverFlow : shell.coverFlow).showOpening()
    openItem(item, background)
  }

  const toggleFullscreen = (): void => {
    if (shell.fullscreen.isOpen) {
      shell.fullscreen.close()
      return
    }
    shell.fullscreen.open()
    shell.fullscreen.coverFlow.setItems(store.value.visibleCovers)
    renderPosition(motion.position)
  }

  const dispatch = (command: NavigationCommand): void => {
    const count = store.value.visibleCovers.length
    if (command.type === 'search') setQuery(command.query)
    else if (command.type === 'next') motion.moveTarget(1)
    else if (command.type === 'previous') motion.moveTarget(-1)
    else if (command.type === 'move') motion.moveTarget(command.delta)
    else if (command.type === 'first') motion.setTarget(0)
    else if (command.type === 'last') motion.setTarget(Math.max(0, count - 1))
    else if (command.type === 'page-previous') motion.moveTarget(-5)
    else if (command.type === 'page-next') motion.moveTarget(5)
    else if (command.type === 'open') openCurrent(command.background)
    else if (command.type === 'toggle-fullscreen') toggleFullscreen()
    else if (command.type === 'escape') {
      if (shell.fullscreen.isOpen) shell.fullscreen.close()
      else shell.sidebar.search.clear()
    }
  }

  const activateCover = (index: number): void => {
    if (Math.round(motion.position) === index) dispatch({ type: 'open' })
    else motion.setTarget(index)
  }

  shell.sidebar.onSelect((id) => {
    shell.sidebar.search.clear()
    setCollection(id)
  })
  shell.sidebar.search.onSearch((query) => dispatch({ type: 'search', query }))
  shell.titleBar.fullscreenButton.addEventListener('click', toggleFullscreen)
  shell.status.onRetry(() => void load())
  shell.scrubber.onSeek((index) => motion.setTarget(index))
  shell.scrubber.onStep((delta) => motion.moveTarget(delta))
  shell.list.onSelect((index) => motion.setTarget(index))
  shell.list.onOpen((index, background) => {
    motion.setTarget(index)
    openItem(store.value.visibleCovers[index], background)
  })
  shell.fullscreen.onClose(() => shell.fullscreen.close())
  shell.fullscreen.onStep((delta) => motion.moveTarget(delta))
  shell.fullscreen.onOpenBookmark(() =>
    openItem(store.value.visibleCovers[Math.round(motion.position)]),
  )
  shell.fullscreen.scrubber.onSeek((index) => motion.setTarget(index))
  shell.coverFlow.onActivate(activateCover)
  shell.fullscreen.coverFlow.onActivate(activateCover)
  preferencesMenu.onChange((change) => {
    const before = store.value
    store.update((state) => ({ ...state, ...change }))
    persistPreferences()
    if (
      before.activeFolderId !== undefined &&
      ((change.sortMode !== undefined && change.sortMode !== before.sortMode) ||
        (change.preferPreviewImages !== undefined &&
          change.preferPreviewImages !== before.preferPreviewImages))
    ) {
      setCollection(before.activeFolderId, false)
    }
  })

  const cleanups = [
    attachKeyboardController(dispatch, shell.sidebar.search.input),
    attachWheelController(shell.coverFlow.element, motion),
    attachPointerController(shell.coverFlow.element, motion),
    attachWheelController(shell.fullscreen.coverFlow.element, motion),
    attachPointerController(shell.fullscreen.coverFlow.element, motion),
  ]

  cleanups.push(
    store.subscribe((state) => {
      const changed = <K extends keyof AppState>(key: K): boolean =>
        previous === undefined || previous[key] !== state[key]
      if (changed('folders') || changed('recentBookmarks') || changed('activeFolderId'))
        shell.sidebar.render(sidebarGroups(state), state.activeFolderId)
      shell.titleBar.render(
        state.query.trim() !== '' ? t('searchResults') : collectionTitle(state),
        state.status === 'ready' ? countText(state) : '',
      )
      shell.status.render(stageState(state))
      preferencesMenu.render(preferencesOf(state))
      if (changed('theme') || changed('showReflection') || changed('reduceFlipMotion'))
        applyAppearance(state)
      if (changed('coverAngle')) {
        shell.coverFlow.setAngle(state.coverAngle)
        shell.fullscreen.coverFlow.setAngle(state.coverAngle)
      }
      if (changed('visibleCovers') || changed('recentBookmarks'))
        shell.list.setItems(
          state.visibleCovers,
          state.query,
          new Map(state.recentBookmarks.map((bookmark) => [bookmark.id, bookmark.openedAt])),
        )
      if (changed('activeFolderId') || changed('visibleCovers')) {
        const before = previous?.visibleCovers ?? []
        const preservesSelection =
          previous?.activeFolderId === state.activeFolderId &&
          state.visibleCovers.length === before.length &&
          state.visibleCovers.every((item, index) => item.bookmarkId === before[index]?.bookmarkId)
        shell.coverFlow.setItems(state.visibleCovers)
        if (shell.fullscreen.isOpen) shell.fullscreen.coverFlow.setItems(state.visibleCovers)
        motion.setItemCount(state.visibleCovers.length)
        if (!preservesSelection) {
          motion.setTarget(selectBookmark(state.selectedIndex, state.visibleCovers.length), true)
        } else {
          renderPosition(motion.position)
        }
      }
      previous = state
    }),
  )

  const load = async (): Promise<void> => {
    store.update((state) => ({ ...state, status: 'loading' }))
    try {
      const [folders, preferences, recentBookmarks] = await Promise.all([
        loadBookmarks(repository),
        loadPreferences(),
        loadRecentBookmarks(),
      ])
      store.update((state) => ({ ...state, folders, recentBookmarks, ...preferences }))
      const saved = preferences.activeFolderId
      const special = [ALL_COLLECTION_ID, RECENT_COLLECTION_ID, ADDED_COLLECTION_ID]
      const collectionId =
        saved !== undefined && (special.includes(saved) || findFolder(folders, saved))
          ? saved
          : ALL_COLLECTION_ID
      setCollection(collectionId, false)
    } catch (error: unknown) {
      console.warn('Unable to load Chrome bookmarks.', error)
      store.update((state) => ({ ...state, status: 'error' }))
    }
  }
  await load()

  return () => {
    cleanups.forEach((cleanup) => cleanup())
    cancelAnimationFrame(patchFrame)
    wallpaper.destroy()
    preferencesMenu.destroy()
    shell.coverFlow.destroy()
    shell.status.destroy()
    shell.list.destroy()
    shell.fullscreen.destroy()
    motion.destroy()
  }
}
