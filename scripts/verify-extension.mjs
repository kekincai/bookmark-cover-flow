import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const extensionPath = resolve('dist')
const profilePath = await mkdtemp(join(tmpdir(), 'bookmark-cover-flow-v1-'))
const screenshotPath = resolve('docs/assets/store-screenshot-1280x800.png')
const readmeScreenshotPath = resolve('docs/assets/screenshot.png')

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
  const labels = await worker.evaluate(() =>
    Object.fromEntries(
      [
        'viewOptions',
        'sortTitle',
        'sortBookmark',
        'light',
        'showReflection',
        'closeSettings',
        'recent',
      ].map((key) => [key, chrome.i18n.getMessage(key)]),
    ),
  )

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

  await page
    .locator('.cover-card__preview[data-loaded="true"]')
    .first()
    .waitFor({ state: 'visible', timeout: 20_000 })
  const previewSource = await page.locator('.cover-card__preview').first().getAttribute('src')

  await page.getByRole('button', { name: labels.viewOptions }).click()
  await page.getByRole('radio', { name: labels.sortTitle, exact: true }).click()
  await page.getByRole('radio', { name: labels.sortBookmark, exact: true }).click()
  await page.getByRole('radio', { name: labels.light, exact: true }).click()
  await page.getByLabel(labels.showReflection).uncheck()
  await page.getByLabel(labels.showReflection).check()
  await page.getByRole('button', { name: labels.closeSettings }).click()
  const frameSample = page.evaluate(async () => {
    const intervals = []
    let last = performance.now()
    const end = last + 1400
    await new Promise((resolve) => {
      const tick = (time) => {
        intervals.push(time - last)
        last = time
        if (time < end) requestAnimationFrame(tick)
        else resolve()
      }
      requestAnimationFrame(tick)
    })
    const valid = intervals.slice(1).sort((a, b) => a - b)
    return {
      frames: valid.length,
      medianMs: Number(valid[Math.floor(valid.length * 0.5)].toFixed(2)),
      p95Ms: Number(valid[Math.floor(valid.length * 0.95)].toFixed(2)),
      maxMs: Number(valid.at(-1).toFixed(2)),
    }
  })
  await page.mouse.move(640, 420)
  await page.mouse.wheel(420, 0)
  await page.waitForTimeout(350)
  await page.mouse.wheel(-180, 0)
  const motionFrames = await frameSample
  await page.keyboard.press('Home')
  await page.waitForTimeout(600)
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(700)
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  })
  await page.mouse.move(20, 740)
  await page.waitForTimeout(250)
  await page.screenshot({ path: screenshotPath })
  await page.setViewportSize({ width: 1584, height: 1000 })
  await page.waitForTimeout(250)
  await page.screenshot({ path: readmeScreenshotPath })
  const renderingCapabilities = await page.evaluate(() => ({
    hdrDisplay: matchMedia('(dynamic-range: high)').matches,
    webgpu: 'gpu' in navigator,
    hdrRenderer: document.querySelector('.hdr-glass-layer')?.getAttribute('data-hdr-renderer'),
    previewCount: document.querySelectorAll('.cover-card__preview[data-loaded="true"]').length,
  }))

  const extensionPage = page
  const selectedTitle = await page.locator('.bookmark-meta h1').innerText()
  const newPagePromise = context.waitForEvent('page')
  await extensionPage.keyboard.press('Enter')
  const openedPage = await newPagePromise
  await openedPage.waitForLoadState('domcontentloaded').catch(() => undefined)
  await openedPage.close()
  await extensionPage.bringToFront()
  await extensionPage.locator('.folder-navigation__back').click()
  await extensionPage.locator('.folder-navigation__back').click()
  await extensionPage.getByRole('button', { name: labels.recent, exact: true }).click()
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
  assert.equal(recentTitle, selectedTitle, 'Enter must open the currently selected bookmark')
  assert.equal(Number(stressTotal), 5000)
  assert.equal(stressDomCovers, 8)
  assert.ok(renderingCapabilities.previewCount > 0)
  assert.deepEqual(consoleErrors, [])

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
        renderingCapabilities,
        motionFrames,
        recentTitle,
        stressTotal: Number(stressTotal),
        stressDomCovers,
        stressRenderMs,
        screenshotPath,
        readmeScreenshotPath,
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
