import { chromium } from '@playwright/test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const extensionPath = resolve('dist')
const profilePath = await mkdtemp(join(tmpdir(), 'bookmark-cover-flow-v1-'))
const screenshotPath = resolve('docs/assets/store-screenshot-1280x800.png')

const publicFolders = [
  {
    title: 'Development',
    bookmarks: [
      ['OpenAI Codex', 'https://github.com/openai/codex'],
      ['MDN Web Docs', 'https://developer.mozilla.org/'],
      ['TypeScript', 'https://www.typescriptlang.org/'],
      ['Apple Developer', 'https://developer.apple.com/'],
      ['Chrome Extensions', 'https://developer.chrome.com/docs/extensions/'],
    ],
  },
  {
    title: 'Design',
    bookmarks: [
      ['Figma', 'https://www.figma.com/'],
      ['Smashing Magazine', 'https://www.smashingmagazine.com/'],
      ['A List Apart', 'https://alistapart.com/'],
      ['Designing for Accessibility', 'https://www.w3.org/WAI/fundamentals/accessibility-intro/'],
      ['Material Design', 'https://m3.material.io/'],
    ],
  },
  {
    title: 'Reading',
    bookmarks: [
      ['Cover Flow', 'https://en.wikipedia.org/wiki/Cover_Flow'],
      ['Internet Archive', 'https://archive.org/'],
      ['Project Gutenberg', 'https://www.gutenberg.org/'],
      ['NASA', 'https://www.nasa.gov/'],
      ['Aeon', 'https://aeon.co/'],
    ],
  },
]

let context
try {
  context = await chromium.launchPersistentContext(profilePath, {
    headless: false,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  })

  let workers = context.serviceWorkers()
  if (workers.length === 0) {
    workers = [await context.waitForEvent('serviceworker', { timeout: 15_000 })]
  }
  const worker = workers[0]
  if (worker === undefined) throw new Error('Extension service worker did not start.')

  const seedResult = await worker.evaluate(
    async ({ folders }) => {
      const roots = await chrome.bookmarks.getTree()
      const parentId = roots[0]?.children?.[0]?.id
      if (parentId === undefined) throw new Error('Chrome bookmark root is unavailable.')
      const qaRoot = await chrome.bookmarks.create({ parentId, title: 'Public QA Library' })
      for (const folderData of folders) {
        const folder = await chrome.bookmarks.create({
          parentId: qaRoot.id,
          title: folderData.title,
        })
        for (const [title, url] of folderData.bookmarks) {
          await chrome.bookmarks.create({ parentId: folder.id, title, url })
        }
      }

      const stress = await chrome.bookmarks.create({ parentId: qaRoot.id, title: 'Stress 5000' })
      for (let start = 0; start < 5_000; start += 100) {
        await Promise.all(
          Array.from({ length: 100 }, (_, offset) => {
            const index = start + offset
            return chrome.bookmarks.create({
              parentId: stress.id,
              title: `Public test bookmark ${String(index + 1).padStart(4, '0')}`,
              url: `https://example.com/?bookmark=${index + 1}`,
            })
          }),
        )
      }
      return { qaRootId: qaRoot.id, stressId: stress.id }
    },
    { folders: publicFolders },
  )

  const extensionId = new URL(worker.url()).host
  const page = await context.newPage()
  const consoleErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  await page.setViewportSize({ width: 1280, height: 800 })
  const startedAt = performance.now()
  await page.goto(`chrome-extension://${extensionId}/index.html`)
  await page.getByRole('button', { name: 'Public QA Library', exact: true }).click()
  await page.getByRole('button', { name: 'Development', exact: true }).click()
  await page.locator('.cover-card').first().waitFor({ state: 'visible' })
  const initialRenderMs = Math.round(performance.now() - startedAt)

  await page.locator('.cover-card__preview').first().waitFor({ state: 'visible', timeout: 20_000 })
  const previewSource = await page.locator('.cover-card__preview').first().getAttribute('src')

  await page.getByRole('button', { name: 'View options' }).click()
  await page.getByLabel('Sort bookmarks').selectOption('title')
  await page.getByLabel('Color theme').selectOption('dark')
  await page.getByLabel('Show reflection').uncheck()
  await page.getByRole('button', { name: 'View options' }).click()
  await page.screenshot({ path: screenshotPath })

  const extensionPage = page
  const newPagePromise = context.waitForEvent('page')
  await extensionPage.keyboard.press('Enter')
  const openedPage = await newPagePromise
  await openedPage.waitForLoadState('domcontentloaded').catch(() => undefined)
  await openedPage.close()
  await extensionPage.bringToFront()
  await extensionPage.locator('.folder-navigation__back').click()
  await extensionPage.locator('.folder-navigation__back').click()
  await extensionPage.getByRole('button', { name: 'Recent', exact: true }).click()
  await extensionPage.locator('.cover-card').first().waitFor({ state: 'visible' })
  const recentTitle = await extensionPage.locator('.bookmark-meta h1').innerText()

  await extensionPage.locator('.folder-navigation__item').nth(1).click()
  await extensionPage.getByRole('button', { name: 'Public QA Library', exact: true }).click()
  const stressStartedAt = performance.now()
  await extensionPage.getByRole('button', { name: 'Stress 5000', exact: true }).click()
  await extensionPage.locator('.cover-card').first().waitFor({ state: 'visible' })
  const stressRenderMs = Math.round(performance.now() - stressStartedAt)
  const stressDomCovers = await extensionPage.locator('.cover-card').count()
  const stressTotal = await extensionPage
    .locator('.cover-card')
    .first()
    .getAttribute('aria-setsize')

  console.log(
    JSON.stringify(
      {
        extensionId,
        worker: worker.url(),
        seedResult,
        publicBookmarks: publicFolders.reduce(
          (total, folder) => total + folder.bookmarks.length,
          0,
        ),
        initialRenderMs,
        previewSource,
        recentTitle,
        stressTotal: Number(stressTotal),
        stressDomCovers,
        stressRenderMs,
        screenshotPath,
        consoleErrors,
      },
      null,
      2,
    ),
  )
} finally {
  await context?.close()
  await rm(profilePath, { recursive: true, force: true })
}
