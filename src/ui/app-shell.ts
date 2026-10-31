import { createBookmarkGrid, type BookmarkGridView } from './components/bookmark-grid'
import { createBookmarkList, type BookmarkListView } from './components/bookmark-list'
import { createBookmarkMeta, type BookmarkMetaView } from './components/bookmark-meta'
import { createCoverFlow, type CoverFlowView } from './components/cover-flow'
import { createFullscreenView, type FullscreenView } from './components/fullscreen-view'
import { createScrubber, type ScrubberView } from './components/scrubber'
import { createSidebar, type SidebarView } from './components/sidebar'
import { createStageStatus, type StageStatusView } from './components/stage-status'
import { createTitleBar, type TitleBarView } from './components/title-bar'

export interface AppShell {
  readonly element: HTMLElement
  readonly sidebar: SidebarView
  readonly titleBar: TitleBarView
  /** Carries `data-view`; CSS shows the stage, grid or list accordingly. */
  readonly main: HTMLElement
  /** Hosts the wallpaper surface, the covers and the stage overlays. */
  readonly stage: HTMLElement
  readonly coverFlow: CoverFlowView
  readonly meta: BookmarkMetaView
  readonly status: StageStatusView
  /** The same loading, empty and error states, shown over the grid and list views. */
  readonly browseStatus: StageStatusView
  readonly scrubber: ScrubberView
  readonly list: BookmarkListView
  readonly grid: BookmarkGridView
  readonly fullscreen: FullscreenView
}

export function createAppShell(): AppShell {
  const element = document.createElement('div')
  element.className = 'app-shell'
  const sidebar = createSidebar()
  const main = document.createElement('main')
  main.className = 'app-main'
  const titleBar = createTitleBar()

  const stage = document.createElement('div')
  stage.className = 'stage'
  const coverFlow = createCoverFlow()
  const meta = createBookmarkMeta()
  const status = createStageStatus()
  const scrubber = createScrubber()
  stage.append(coverFlow.element, meta.element, status.element, scrubber.element)

  const list = createBookmarkList()
  const grid = createBookmarkGrid()
  const browseStatus = createStageStatus()
  browseStatus.element.classList.add('stage-status--browse')
  const body = document.createElement('div')
  body.className = 'app-body'
  body.append(stage, list.element, grid.element, browseStatus.element)
  main.append(titleBar.element, body)
  element.append(sidebar.element, main)
  const fullscreen = createFullscreenView()

  return {
    element,
    sidebar,
    titleBar,
    main,
    stage,
    coverFlow,
    meta,
    status,
    browseStatus,
    scrubber,
    list,
    grid,
    fullscreen,
  }
}
