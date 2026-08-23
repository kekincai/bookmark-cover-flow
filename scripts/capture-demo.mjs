import { chromium } from '@playwright/test'
import { copyFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const extensionPath = resolve('dist')
const profilePath = await mkdtemp(join(tmpdir(), 'bookmark-cover-flow-demo-'))
const videoDirectory = await mkdtemp(join(tmpdir(), 'bookmark-cover-flow-video-'))
const outputPath = resolve('docs/assets/demo.webm')
let context

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
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Public Library', exact: true }).click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: 'Development', exact: true }).click()
  await page.locator('.cover-card__preview').first().waitFor({ state: 'visible', timeout: 20_000 })
  await page.waitForTimeout(700)
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(600)
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(600)
  await page.locator('.folder-navigation__back').click()
  await page.getByRole('button', { name: 'Design', exact: true }).click()
  await page.waitForTimeout(900)
  await page.keyboard.press('/')
  await page.getByRole('searchbox').fill('figma')
  await page.waitForTimeout(900)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)

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
