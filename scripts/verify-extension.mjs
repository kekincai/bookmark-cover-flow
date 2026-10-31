import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/*
 * Loads the built extension into an isolated, temporary Chrome profile seeded only with public
 * bookmarks (never the user's library), then verifies the real extension end to end.
 * The UI (and screenshot) language is Chrome's UI language, which on macOS follows the system;
 * Playwright's `locale` option is deliberately not used because it changes getUILanguage() but
 * not chrome.i18n.getMessage(), which would mix languages.
 * Set SCREENSHOT_DIR to also save light/dark, full-screen and settings screenshots for review.
 */

const extensionPath = resolve('dist')
const profilePath = await mkdtemp(join(tmpdir(), 'bookmark-cover-flow-verify-'))
const storeScreenshotPath = resolve('docs/assets/store-screenshot-1280x800.png')
const readmeScreenshotPath = resolve('docs/assets/screenshot.png')
const settingsScreenshotPath = resolve('docs/assets/settings.png')
const reviewDirectory = process.env.SCREENSHOT_DIR ? resolve(process.env.SCREENSHOT_DIR) : undefined
const STRESS_COUNT = 5_000
const PREVIEW_TIMEOUT_MS = 30_000

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
const publicBookmarks = publicFolders.reduce((total, folder) => total + folder.bookmarks.length, 0)

const sidebarItem = (page, title) =>
  page.locator('nav.sidebar .sidebar-item').filter({
    has: page.locator('.sidebar-item__title', { hasText: new RegExp(`^${title}$`) }),
  })
const stageTitle = (page) => page.locator('.stage .bookmark-meta__title')
const stageCovers = (page) => page.locator('.stage .cover-card')

/** Settle the stage on `index` and let previews near it finish (or give up on slow sites). */
async function settleOn(page, index) {
  await page.locator('.stage .scrubber__range').fill(String(index))
  await page
    .locator(`.stage .cover-flow[data-position="${index}.00000"]`)
    .waitFor({ timeout: 5_000 })
  await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll('.stage .cover-card')].every(
          (card) =>
            card.dataset.state !== 'pending' &&
            (card.dataset.state !== 'preview' ||
              card.querySelector('.cover-card__preview[data-loaded="true"]') !== null ||
              card.querySelector('.cover-card__preview') === null),
        ),
      undefined,
      { timeout: PREVIEW_TIMEOUT_MS },
    )
    .catch(() => console.warn('Some previews were still loading when the screenshot was taken.'))
  await page.waitForTimeout(400)
}

/** rAF interval percentiles while `drive` runs. */
async function sampleFrames(page, drive) {
  const sample = page.evaluate(async () => {
    const intervals = []
    let last = performance.now()
    const end = last + 1500
    await new Promise((done) => {
      const tick = (time) => {
        intervals.push(time - last)
        last = time
        if (time < end) requestAnimationFrame(tick)
        else done()
      }
      requestAnimationFrame(tick)
    })
    const valid = intervals.slice(1).sort((a, b) => a - b)
    const at = (ratio) => Number(valid[Math.floor((valid.length - 1) * ratio)].toFixed(2))
    return { frames: valid.length, p50Ms: at(0.5), p95Ms: at(0.95), maxMs: at(1) }
  })
  await drive()
  return sample
}

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
        'settings',
        'sortBookmarks',
        'light',
        'dark',
        'reflection',
        'coverAngle',
        'done',
        'recent',
        'allBookmarks',
        'privacy',
        'clear',
        'enterFullscreen',
        'exitFullscreen',
        'bookmarkList',
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
      return { qaRootId: qaRoot.id }
    },
    { folders: publicFolders },
  )

  const extensionId = new URL(worker.url()).host
  const appUrl = `chrome-extension://${extensionId}/index.html`
  const page = await context.newPage()
  const consoleErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))
  await page.setViewportSize({ width: 1280, height: 800 })

  /* ---------- Initial render: All Bookmarks with the public library ---------- */
  const startedAt = performance.now()
  await page.goto(appUrl)
  await stageCovers(page).first().waitFor({ state: 'visible' })
  const initialRenderMs = Math.round(performance.now() - startedAt)
  await page.locator('.title-bar__title', { hasText: labels.allBookmarks }).waitFor()
  assert.equal(await stageTitle(page).innerText(), 'OpenAI Codex')
  assert.equal(
    await stageCovers(page).first().getAttribute('aria-setsize'),
    String(publicBookmarks),
  )

  /* ---------- Real previews from the background service worker ---------- */
  let previewSource = null
  try {
    await page
      .locator('.stage .cover-card__preview[data-loaded="true"]')
      .first()
      .waitFor({ state: 'attached', timeout: PREVIEW_TIMEOUT_MS })
    previewSource = await page
      .locator('.stage .cover-card__preview[data-loaded="true"]')
      .first()
      .getAttribute('src')
  } catch {
    previewSource = null
  }
  // Every nearby cover must resolve: either a loaded site preview or generated album art.
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('.stage .cover-card')].every(
        (card) => card.dataset.state !== 'pending',
      ),
    undefined,
    { timeout: PREVIEW_TIMEOUT_MS },
  )
  const coverStates = await stageCovers(page).evaluateAll((cards) =>
    cards.map((card) => card.dataset.state),
  )

  /* ---------- Sidebar navigation ---------- */
  await sidebarItem(page, 'Development').click()
  await page.locator('.title-bar__title', { hasText: 'Development' }).waitFor()
  assert.equal(await stageCovers(page).count(), 5)
  await sidebarItem(page, 'Reading').click()
  await page.locator('.title-bar__title', { hasText: 'Reading' }).waitFor()
  assert.equal(await stageTitle(page).innerText(), 'Cover Flow')
  await sidebarItem(page, labels.allBookmarks).click()
  await page.locator('.title-bar__title', { hasText: labels.allBookmarks }).waitFor()

  /* ---------- Settings dialog ---------- */
  const gear = page.getByRole('button', { name: labels.viewOptions, exact: true })
  await gear.click()
  const dialog = page.getByRole('dialog', { name: labels.settings, exact: true })
  await dialog.waitFor({ state: 'visible' })
  await dialog.getByLabel(labels.sortBookmarks).selectOption('title')
  await page.locator('.stage .bookmark-meta__title', { hasText: 'A List Apart' }).waitFor()
  await dialog.getByLabel(labels.sortBookmarks).selectOption('bookmark')
  await page.locator('.stage .bookmark-meta__title', { hasText: 'OpenAI Codex' }).waitFor()
  await dialog.getByRole('radio', { name: labels.dark, exact: true }).click()
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark')
  await dialog.getByRole('radio', { name: labels.light, exact: true }).click()
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light')
  await dialog.getByRole('switch', { name: labels.reflection }).uncheck()
  assert.equal(await page.locator('html').getAttribute('data-reflection'), 'false')
  await dialog.getByRole('switch', { name: labels.reflection }).check()
  await dialog.getByRole('slider', { name: labels.coverAngle }).fill('60')
  await page
    .locator('.stage .cover-card[data-index="1"][style*="rotateY(60deg)"]')
    .waitFor({ timeout: 2_000 })
  await dialog.getByRole('slider', { name: labels.coverAngle }).fill('70')
  await dialog.getByRole('tab', { name: labels.privacy }).click()
  // In the extension the Privacy tab can clear both the preview cache and the history.
  const clearButtons = await dialog.getByRole('button', { name: labels.clear }).count()
  assert.equal(clearButtons, 2)
  await dialog.getByRole('tab').first().click()
  await dialog.getByRole('button', { name: labels.done, exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })

  /* ---------- Screenshots (light, 1280×800 store and 1440×900 README) ---------- */
  await settleOn(page, 2)
  const prepareShot = async () => {
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    })
    await page.mouse.move(4, 796)
    await page.waitForTimeout(300)
  }
  await prepareShot()
  await page.screenshot({ path: storeScreenshotPath })
  await page.setViewportSize({ width: 1440, height: 900 })
  await prepareShot()
  await page.screenshot({ path: readmeScreenshotPath })

  await page.setViewportSize({ width: 1280, height: 800 })
  await gear.click()
  await dialog.waitFor({ state: 'visible' })
  await page.waitForTimeout(400)
  await page.screenshot({ path: settingsScreenshotPath })
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden' })

  const reviewShots = []
  if (reviewDirectory !== undefined) {
    await mkdir(reviewDirectory, { recursive: true })
    for (const theme of ['light', 'dark']) {
      await gear.click()
      await dialog.getByRole('radio', { name: labels[theme], exact: true }).click()
      await page.keyboard.press('Escape')
      await dialog.waitFor({ state: 'hidden' })
      for (const [width, height] of [
        [1440, 900],
        [1280, 800],
      ]) {
        await page.setViewportSize({ width, height })
        await prepareShot()
        const main = join(reviewDirectory, `main-${theme}-${width}x${height}.png`)
        await page.screenshot({ path: main })
        await page.keyboard.press('f')
        await page.locator('.fullscreen').waitFor({ state: 'visible' })
        await prepareShot()
        await page.waitForTimeout(600)
        const fullscreen = join(reviewDirectory, `fullscreen-${theme}-${width}x${height}.png`)
        await page.screenshot({ path: fullscreen })
        await page.keyboard.press('Escape')
        await page.locator('.fullscreen').waitFor({ state: 'hidden' })
        await gear.click()
        await dialog.waitFor({ state: 'visible' })
        await page.waitForTimeout(400)
        const settings = join(reviewDirectory, `settings-${theme}-${width}x${height}.png`)
        await page.screenshot({ path: settings })
        await page.keyboard.press('Escape')
        await dialog.waitFor({ state: 'hidden' })
        reviewShots.push(main, fullscreen, settings)
      }
    }
    await gear.click()
    await dialog.getByRole('radio', { name: labels.light, exact: true }).click()
    await page.keyboard.press('Escape')
    await page.setViewportSize({ width: 1280, height: 800 })
  }

  /* ---------- Opening a bookmark records it under Recently Opened ---------- */
  await page.locator('.stage .cover-card[aria-current="true"]').focus()
  const selectedTitle = await stageTitle(page).innerText()
  const newPagePromise = context.waitForEvent('page')
  await page.keyboard.press('Enter')
  const openedPage = await newPagePromise
  await openedPage.waitForLoadState('domcontentloaded').catch(() => undefined)
  const openedUrl = openedPage.url()
  await openedPage.close()
  await page.bringToFront()
  await sidebarItem(page, labels.recent).click()
  await page.locator('.title-bar__title', { hasText: labels.recent }).waitFor()
  await stageCovers(page).first().waitFor({ state: 'visible' })
  const recentTitle = await stageTitle(page).innerText()
  assert.equal(recentTitle, selectedTitle, 'Enter must open the currently selected bookmark')

  /* ---------- Stress: 5,000 bookmarks in one folder ---------- */
  await worker.evaluate(
    async ({ qaRootId, count }) => {
      const stress = await chrome.bookmarks.create({ parentId: qaRootId, title: 'Stress 5000' })
      for (let start = 0; start < count; start += 100) {
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
    },
    { qaRootId: seedResult.qaRootId, count: STRESS_COUNT },
  )
  await sidebarItem(page, labels.allBookmarks).click()
  const reloadStartedAt = performance.now()
  await page.reload()
  await page
    .locator('.stage .cover-card[aria-setsize="' + String(STRESS_COUNT + publicBookmarks) + '"]')
    .first()
    .waitFor({ state: 'visible' })
  const allBookmarksRenderMs = Math.round(performance.now() - reloadStartedAt)

  const stressStartedAt = performance.now()
  await sidebarItem(page, 'Stress 5000').click()
  await page
    .locator('.stage .cover-card[aria-setsize="5000"]')
    .first()
    .waitFor({ state: 'visible' })
  const stressRenderMs = Math.round(performance.now() - stressStartedAt)
  const stressTotal = Number(await stageCovers(page).first().getAttribute('aria-setsize'))

  // Continuous wheel input over the stage while sampling frame intervals.
  const stageBox = await page.locator('.stage').boundingBox()
  await page.mouse.move(stageBox.x + stageBox.width / 2, stageBox.y + 160)
  const wheelFrames = await sampleFrames(page, async () => {
    for (let step = 0; step < 60; step += 1) {
      await page.mouse.wheel(0, 24)
      await page.waitForTimeout(16)
    }
  })
  await page.waitForFunction(
    () => document.querySelector('.stage .cover-flow')?.dataset.position?.endsWith('.00000'),
    undefined,
    { timeout: 5_000 },
  )
  const afterWheel = Number(await page.locator('.stage .cover-flow').getAttribute('data-position'))
  assert.ok(afterWheel > 5, `Wheel input should travel several covers (was ${afterWheel}).`)
  assert.equal(afterWheel, Math.round(afterWheel), 'Wheel input must snap to a whole cover.')

  // Drag the scrubber thumb across the whole 5,000-item track with a real pointer.
  // Keyboard commands go to the stage (the sidebar keeps its own arrow/Home/End keys).
  await page.locator('.stage .cover-card[aria-current="true"]').focus()
  await page.keyboard.press('Home')
  await page.locator('.stage .cover-flow[data-position="0.00000"]').waitFor({ timeout: 10_000 })
  const track = await page.locator('.stage .scrubber__range').boundingBox()
  const scrubFrames = await sampleFrames(page, async () => {
    const y = track.y + track.height / 2
    await page.mouse.move(track.x + 4, y)
    await page.mouse.down()
    for (let step = 0; step <= 60; step += 1) {
      await page.mouse.move(track.x + 4 + ((track.width - 8) * step) / 60, y)
      await page.waitForTimeout(16)
    }
    await page.mouse.up()
  })
  const afterScrub = Number(await page.locator('.stage .cover-flow').getAttribute('data-position'))
  assert.ok(
    afterScrub > STRESS_COUNT * 0.9,
    `The scrubber should follow the pointer (${afterScrub}).`,
  )

  await page.locator('.stage .cover-card[aria-current="true"]').focus()
  await page.keyboard.press('End')
  await page
    .locator(`.stage .cover-flow[data-position="${STRESS_COUNT - 1}.00000"]`)
    .waitFor({ timeout: 10_000 })
  const virtualization = await page.evaluate(() => {
    const grid = document.querySelector('.bookmark-list__grid')
    return {
      covers: document.querySelectorAll('.stage .cover-card').length,
      listRows: document.querySelectorAll('.bookmark-list__row[data-index]').length,
      listRowCount: Number(grid?.getAttribute('aria-rowcount')),
      selectedRow: document.querySelector('.bookmark-list__row[aria-selected="true"]')?.dataset
        .index,
    }
  })
  await page.keyboard.press('Home')
  await page.locator('.stage .cover-flow[data-position="0.00000"]').waitFor({ timeout: 10_000 })
  const stressDomCovers = await stageCovers(page).count()

  const previewCount = await page
    .locator('.cover-card__preview[data-loaded="true"]')
    .count()
    .catch(() => 0)

  assert.equal(stressTotal, STRESS_COUNT)
  assert.ok(stressDomCovers <= 15, `Expected ≤ 15 covers in the DOM, found ${stressDomCovers}`)
  assert.ok(
    virtualization.covers <= 15,
    `Expected ≤ 15 covers at the end, found ${virtualization.covers}`,
  )
  assert.equal(virtualization.listRowCount, STRESS_COUNT + 1)
  assert.ok(
    virtualization.listRows > 0 && virtualization.listRows < 100,
    `List rows must be virtualized (found ${virtualization.listRows})`,
  )
  assert.equal(virtualization.selectedRow, String(STRESS_COUNT - 1))
  assert.ok(
    coverStates.every((state) => state === 'preview' || state === 'generated'),
    'Every nearby cover resolved to a preview or generated art',
  )
  // Network-dependent: at least one public site must yield a real preview image.
  assert.ok(previewSource !== null, 'No public site returned a preview image')
  assert.deepEqual(consoleErrors, [])

  console.log(
    JSON.stringify(
      {
        extensionId,
        worker: worker.url(),
        publicBookmarks,
        initialRenderMs,
        previewSource,
        coverStates,
        openedUrl,
        recentTitle,
        allBookmarksRenderMs,
        stressTotal,
        stressRenderMs,
        stressDomCovers,
        virtualization,
        wheelFrames,
        scrubFrames,
        previewCountInStress: previewCount,
        screenshots: [storeScreenshotPath, readmeScreenshotPath, settingsScreenshotPath],
        reviewShots,
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
