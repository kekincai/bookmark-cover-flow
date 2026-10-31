import { chromium } from '@playwright/test'
import { copyFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/* Records docs/assets/demo.webm from the built extension in an isolated profile of public bookmarks. */

const extensionPath = resolve('dist')
const profilePath = await mkdtemp(join(tmpdir(), 'bookmark-cover-flow-demo-'))
const videoDirectory = await mkdtemp(join(tmpdir(), 'bookmark-cover-flow-video-'))
const outputPath = resolve('docs/assets/demo.webm')
let context

const sidebarItem = (page, title) =>
  page.locator('nav.sidebar .sidebar-item').filter({
    has: page.locator('.sidebar-item__title', { hasText: new RegExp(`^${title}$`) }),
  })

try {
  context = await chromium.launchPersistentContext(profilePath, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: videoDirectory, size: { width: 1280, height: 800 } },
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  })

  let workers = context.serviceWorkers()
  if (workers.length === 0) {
    workers = [await context.waitForEvent('serviceworker', { timeout: 15_000 })]
  }
  const worker = workers[0]
  if (worker === undefined) throw new Error('Extension service worker did not start.')

  await worker.evaluate(async () => {
    const roots = await chrome.bookmarks.getTree()
    const parentId = roots[0]?.children?.[0]?.id
    if (parentId === undefined) throw new Error('Chrome bookmark root is unavailable.')
    const library = await chrome.bookmarks.create({ parentId, title: 'Public Library' })
    const groups = [
      {
        title: 'Development',
        items: [
          ['OpenAI Codex', 'https://github.com/openai/codex'],
          ['MDN Web Docs', 'https://developer.mozilla.org/'],
          ['TypeScript', 'https://www.typescriptlang.org/'],
          ['Apple Developer', 'https://developer.apple.com/'],
          ['Chrome Extensions', 'https://developer.chrome.com/docs/extensions/'],
        ],
      },
      {
        title: 'Design',
        items: [
          ['Figma', 'https://www.figma.com/'],
          ['Smashing Magazine', 'https://www.smashingmagazine.com/'],
          ['A List Apart', 'https://alistapart.com/'],
        ],
      },
    ]
    for (const group of groups) {
      const folder = await chrome.bookmarks.create({ parentId: library.id, title: group.title })
      for (const [title, url] of group.items) {
        await chrome.bookmarks.create({ parentId: folder.id, title, url })
      }
    }
  })

  const extensionId = new URL(worker.url()).host
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/index.html`)
  await page
    .locator('.stage .cover-card__preview[data-loaded="true"]')
    .first()
    .waitFor({ state: 'attached', timeout: 20_000 })
    .catch(() => undefined)
  await page.waitForTimeout(900)
  const stage = page.locator('.stage .cover-card[aria-current="true"]')
  await stage.focus()
  for (let step = 0; step < 3; step += 1) {
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(650)
  }
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(700)

  // Trackpad-style scrub over the stage.
  await page.mouse.move(760, 220)
  for (let step = 0; step < 18; step += 1) {
    await page.mouse.wheel(14, 0)
    await page.waitForTimeout(16)
  }
  await page.waitForTimeout(800)

  await sidebarItem(page, 'Design').click()
  await page.waitForTimeout(1000)
  await page.locator('.bookmark-list__row[data-index="2"]').click()
  await page.waitForTimeout(900)

  await page.keyboard.press('/')
  await page.keyboard.type('figma', { delay: 90 })
  await page.waitForTimeout(900)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(600)

  await sidebarItem(page, 'Development').click()
  await page.waitForTimeout(700)
  await page.locator('.stage .cover-card[aria-current="true"]').focus()
  await page.keyboard.press('f')
  await page.waitForTimeout(1000)
  for (let step = 0; step < 2; step += 1) {
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(800)
  }
  await page.keyboard.press('Escape')
  await page.waitForTimeout(700)

  const video = page.video()
  await page.close()
  await context.close()
  context = undefined
  if (video === null) throw new Error('Playwright did not create a demo video.')
  await copyFile(await video.path(), outputPath)
  console.log(outputPath)
} finally {
  await context?.close()
  await rm(profilePath, { recursive: true, force: true })
  await rm(videoDirectory, { recursive: true, force: true })
}
