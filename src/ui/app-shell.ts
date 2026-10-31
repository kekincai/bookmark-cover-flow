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
  /** Hosts the wallpaper surface, the covers and the stage overlays. */
  readonly stage: HTMLElement
  readonly coverFlow: CoverFlowView
  readonly meta: BookmarkMetaView
  readonly status: StageStatusView
  readonly scrubber: ScrubberView
  readonly list: BookmarkListView
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
  main.append(titleBar.element, stage, list.element)
  element.append(sidebar.element, main)
  const fullscreen = createFullscreenView()

  return { element, sidebar, titleBar, stage, coverFlow, meta, status, scrubber, list, fullscreen }
}
