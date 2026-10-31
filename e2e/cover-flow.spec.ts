import { expect, test } from '@playwright/test'
import {
  DEMO_TOTAL,
  coverFlow,
  covers,
  listRows,
  openApp,
  position,
  sidebarItem,
  stageTitle,
} from './helpers'

test('loads the demo library and supports the primary keyboard and search flow', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))

  await openApp(page)
  await expect(page).toHaveTitle('Bookmark Cover Flow')
  await expect(page.locator('.title-bar__detail')).toHaveText(`${DEMO_TOTAL} bookmarks`)
  // Virtualized to selectedIndex ± 7: index 0 renders covers 0…7.
  await expect(covers(page)).toHaveCount(8)
  await expect(page.locator('.stage .cover-card[aria-current="true"]')).toHaveAttribute(
    'aria-label',
    'Design Notes, notion.so',
  )
  await expect(page.locator('.bookmark-meta__subtitle').first()).toHaveText('notion.so · Favorites')

  const github = page.getByRole('button', { name: 'GitHub, github.com' })
  const visiblePoint = await github.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    for (let x = bounds.left + 2; x < bounds.right; x += 4) {
      for (let y = bounds.top + 4; y < bounds.bottom; y += 8) {
        if (document.elementFromPoint(x, y)?.closest('.cover-card') === element) return { x, y }
      }
    }
    return null
  })
  if (visiblePoint === null) throw new Error('The adjacent GitHub cover has no clickable area.')
  await page.mouse.click(visiblePoint.x, visiblePoint.y)
  await expect(stageTitle(page)).toHaveText('GitHub')
  await expect(coverFlow(page)).toHaveAttribute('data-position', '1.00000')

  await page.keyboard.press('ArrowRight')
  await expect(stageTitle(page)).toHaveText('Figma')
  await page.keyboard.press('ArrowLeft')
  await expect(stageTitle(page)).toHaveText('GitHub')

  await page.keyboard.press('/')
  const search = page.getByRole('searchbox', { name: 'Search bookmarks' })
  await expect(search).toBeFocused()
  await search.fill('figma')
  await expect(page.locator('.title-bar__title')).toHaveText('Search Results')
  // "Figma" in Favorites and "Figma" in Design.
  await expect(page.locator('.title-bar__detail')).toHaveText('2 matches for “figma”')
  await expect(covers(page)).toHaveCount(2)
  await expect(stageTitle(page)).toHaveText('Figma')

  await page.keyboard.press('Escape')
  await expect(search).toHaveValue('')
  await expect(page.locator('.title-bar__title')).toHaveText('All Bookmarks')
  await expect(page.locator('.title-bar__detail')).toHaveText(`${DEMO_TOTAL} bookmarks`)
  await expect(covers(page)).toHaveCount(8)

  await page.keyboard.press('Meta+k')
  await expect(search).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(search).not.toBeFocused()
  expect(errors).toEqual([])
})

test('sidebar switches collections, shows counts and marks the active source', async ({ page }) => {
  await openApp(page)
  const sidebar = page.getByRole('navigation', { name: 'Bookmark folders' })
  await expect(sidebar.locator('.sidebar__heading')).toHaveText(['Library', 'Favorites', 'Reading'])
  const counts = await sidebar
    .locator('.sidebar-item')
    .evaluateAll((items) =>
      items.map((item) => [
        item.querySelector('.sidebar-item__title')?.textContent,
        item.querySelector('.sidebar-item__count')?.textContent,
      ]),
    )
  expect(counts).toEqual([
    ['All Bookmarks', '19'],
    ['Recently Opened', '0'],
    ['Recently Added', '19'],
    ['Favorites', '9'],
    ['Development', '3'],
    ['Design', '2'],
    ['Reading', '3'],
    ['Longform', '2'],
  ])
  await expect(sidebarItem(page, 'All Bookmarks')).toHaveAttribute('aria-current', 'page')

  await sidebarItem(page, 'Reading').click()
  await expect(page.locator('.title-bar__title')).toHaveText('Reading')
  await expect(page.locator('.title-bar__detail')).toHaveText('3 bookmarks')
  await expect(stageTitle(page)).toHaveText('The Marginalian')
  await expect(covers(page)).toHaveCount(3)
  await expect(listRows(page)).toHaveCount(3)
  await expect(sidebarItem(page, 'Reading')).toHaveAttribute('aria-current', 'page')
  await expect(sidebarItem(page, 'All Bookmarks')).toHaveAttribute('aria-current', 'false')

  await sidebarItem(page, 'Design').click()
  await expect(page.locator('.title-bar__detail')).toHaveText('2 bookmarks')
  await expect(page.locator('.bookmark-meta__subtitle').first()).toHaveText('figma.com · Design')

  await sidebarItem(page, 'Recently Opened').click()
  await expect(page.locator('.title-bar__title')).toHaveText('Recently Opened')
  await expect(covers(page)).toHaveCount(0)
  const status = page.locator('.stage-status')
  await expect(status).toBeVisible()
  await expect(status).toHaveAttribute('data-kind', 'empty')
  await expect(status).toContainText('No recent bookmarks yet')

  // Keyboard: arrows move within the sidebar and never reach the covers.
  await sidebarItem(page, 'Favorites').click()
  await expect(stageTitle(page)).toHaveText('Design Notes')
  await sidebarItem(page, 'Favorites').focus()
  await page.keyboard.press('ArrowDown')
  await expect(sidebarItem(page, 'Development')).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(coverFlow(page)).toHaveAttribute('data-position', '0.00000')
  await page.keyboard.press('Enter')
  await expect(page.locator('.title-bar__title')).toHaveText('Development')

  // The selected collection persists.
  await page.reload()
  await expect(page.locator('.title-bar__title')).toHaveText('Development')
  await expect(sidebarItem(page, 'Development')).toHaveAttribute('aria-current', 'page')
})

test('search shows a no-results state, a clear button and highlights matches', async ({ page }) => {
  await openApp(page)
  const search = page.getByRole('searchbox', { name: 'Search bookmarks' })
  const clear = page.getByRole('button', { name: 'Clear search' })
  await expect(clear).toBeHidden()

  await search.fill('git')
  await expect(clear).toBeVisible()
  await expect(page.locator('.title-bar__detail')).toHaveText('2 matches for “git”')
  await expect(listRows(page)).toHaveCount(2)
  await expect(listRows(page).first().locator('.bookmark-list__title mark')).toHaveText('Git')
  await expect(listRows(page).first().locator('.bookmark-list__cell--site mark')).toHaveText('git')

  await search.fill('zzzz-nothing')
  await expect(page.locator('.title-bar__title')).toHaveText('Search Results')
  await expect(page.locator('.title-bar__detail')).toHaveText('0 matches for “zzzz-nothing”')
  await expect(covers(page)).toHaveCount(0)
  await expect(listRows(page)).toHaveCount(0)
  const status = page.locator('.stage-status')
  await expect(status).toHaveAttribute('data-kind', 'no-results')
  await expect(status).toContainText('No results for “zzzz-nothing”')
  await expect(status).toContainText('Try other keywords')
  await expect(page.locator('.stage .bookmark-meta')).toBeHidden()

  await clear.click()
  await expect(search).toHaveValue('')
  await expect(search).toBeFocused()
  await expect(clear).toBeHidden()
  await expect(status).toBeHidden()
  await expect(covers(page)).toHaveCount(8)
  await expect(listRows(page).locator('mark')).toHaveCount(0)
})

test('list rows sync the stage; list keys stay in the list', async ({ page }) => {
  await openApp(page)
  const grid = page.getByRole('grid', { name: 'Bookmark list' })
  await expect(listRows(page).first()).toHaveAttribute('aria-selected', 'true')

  await page.locator('.bookmark-list__row[data-index="4"]').click()
  await expect(stageTitle(page)).toHaveText('Apple Developer')
  await expect(coverFlow(page)).toHaveAttribute('data-position', '4.00000')
  await expect(page.locator('.bookmark-list__row[data-index="4"]')).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.locator('.bookmark-list__row[data-index="0"]')).toHaveAttribute(
    'aria-selected',
    'false',
  )

  // The stage drives the list, too.
  await page.getByRole('button', { name: 'Next bookmark' }).first().click()
  await expect(stageTitle(page)).toHaveText('Linear')
  await expect(page.locator('.bookmark-list__row[data-index="5"]')).toHaveAttribute(
    'aria-selected',
    'true',
  )

  await grid.focus()
  await page.keyboard.press('ArrowDown')
  await expect(stageTitle(page)).toHaveText('The Browser Company')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowUp')
  await expect(stageTitle(page)).toHaveText('Apple Developer')
  await expect(coverFlow(page)).toHaveAttribute('data-position', '4.00000')
  await expect(grid).toHaveAttribute('aria-activedescendant', /row-4$/)

  // Left/right belong to the stage; the global handler must not act while the list has focus.
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(250)
  await expect(coverFlow(page)).toHaveAttribute('data-position', '4.00000')
  await expect(grid).toBeFocused()

  await page.keyboard.press('End')
  await expect(stageTitle(page)).toHaveText('Longreads')
  await expect(coverFlow(page)).toHaveAttribute('data-position', `${DEMO_TOTAL - 1}.00000`)
  await page.keyboard.press('Home')
  await expect(stageTitle(page)).toHaveText('Design Notes')
})

test('opening from the keyboard opens the selected bookmark and records it', async ({
  page,
  context,
}) => {
  await context.route('https://github.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>GitHub fixture</title>' }),
  )
  await openApp(page)
  await page.keyboard.press('ArrowRight')
  await expect(stageTitle(page)).toHaveText('GitHub')
  const opened = context.waitForEvent('page')
  await page.keyboard.press('Enter')
  const tab = await opened
  await expect.poll(() => tab.url()).toContain('github.com')
  await tab.close()
  await expect(sidebarItem(page, 'Recently Opened').locator('.sidebar-item__count')).toHaveText('1')
  await sidebarItem(page, 'Recently Opened').click()
  await expect(stageTitle(page)).toHaveText('GitHub')
  await expect(
    page.locator('.bookmark-list__row[data-index="0"] .bookmark-list__cell--opened'),
  ).toContainText('Today')
})

test('shows locally recorded recent bookmarks', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'bookmark-cover-flow-recent',
      JSON.stringify([
        { id: 'demo-3', title: 'Figma', url: 'https://figma.com', openedAt: 200 },
        { id: 'demo-2', title: 'GitHub', url: 'https://github.com', openedAt: 100 },
      ]),
    )
  })
  await openApp(page)
  await expect(sidebarItem(page, 'Recently Opened').locator('.sidebar-item__count')).toHaveText('2')
  await sidebarItem(page, 'Recently Opened').click()
  await expect(stageTitle(page)).toHaveText('Figma')
  await expect(covers(page)).toHaveCount(2)
  await expect(page.locator('.title-bar__detail')).toHaveText('2 bookmarks')
})

test('exposes virtual position metadata and page navigation', async ({ page }) => {
  await openApp(page)
  const first = covers(page).first()
  await expect(first).toHaveAttribute('aria-setsize', String(DEMO_TOTAL))
  await expect(first).toHaveAttribute('aria-posinset', '1')
  await page.keyboard.press('PageDown')
  await expect(stageTitle(page)).toHaveText('Linear')
  await expect(coverFlow(page)).toHaveAttribute('data-position', '5.00000')
  await page.keyboard.press('PageDown')
  await expect(coverFlow(page)).toHaveAttribute('data-position', '10.00000')
  // ±7 around index 10: covers 3…17.
  await expect(covers(page)).toHaveCount(15)
  await page.keyboard.press('PageUp')
  await expect(coverFlow(page)).toHaveAttribute('data-position', '5.00000')
  await page.keyboard.press('End')
  await expect(stageTitle(page)).toHaveText('Longreads')
  await expect(page.locator('.stage .cover-card[aria-current="true"]')).toHaveAttribute(
    'aria-posinset',
    String(DEMO_TOTAL),
  )
  await expect(page.getByRole('slider', { name: 'Browsing position' }).first()).toHaveAttribute(
    'aria-valuetext',
    `${DEMO_TOTAL} of ${DEMO_TOTAL}`,
  )
  await page.keyboard.press('Home')
  await expect(stageTitle(page)).toHaveText('Design Notes')
})

test('the scrubber seeks and the step buttons move one cover', async ({ page }) => {
  await openApp(page)
  const scrubber = page.locator('.stage .scrubber__range')
  await expect(scrubber).toHaveAttribute('max', String(DEMO_TOTAL - 1))
  await scrubber.fill('12')
  await expect(coverFlow(page)).toHaveAttribute('data-position', '12.00000')
  await expect(stageTitle(page)).toHaveText('Figma')
  await expect(page.locator('.bookmark-meta__subtitle').first()).toHaveText('figma.com · Design')
  await page.locator('.stage').getByRole('button', { name: 'Previous bookmark' }).click()
  await expect(coverFlow(page)).toHaveAttribute('data-position', '11.00000')
  await page.keyboard.press('Home')
  await expect(
    page.locator('.stage').getByRole('button', { name: 'Previous bookmark' }),
  ).toBeDisabled()
})

test('holding an arrow advances at most one cover per 90 ms', async ({ page }) => {
  await openApp(page)
  await page.evaluate(() => {
    const fire = (repeat: boolean): void => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', repeat, bubbles: true }),
      )
    }
    // A burst of OS auto-repeats delivered within a few milliseconds.
    fire(false)
    for (let index = 0; index < 12; index += 1) fire(true)
  })
  await expect(coverFlow(page)).toHaveAttribute('data-position', '1.00000')
  await page.waitForTimeout(300)
  expect(await position(page)).toBe(1)
})

test('shortcuts never fire while typing in search', async ({ page }) => {
  await openApp(page)
  const search = page.getByRole('searchbox', { name: 'Search bookmarks' })
  await search.click()
  await page.keyboard.type('f/')
  await expect(search).toHaveValue('f/')
  await expect(page.locator('.fullscreen')).toBeHidden()
  await search.fill('')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('End')
  await page.keyboard.press('PageDown')
  await page.keyboard.press('F')
  await expect(search).toHaveValue('F')
  await page.waitForTimeout(250)
  await expect(coverFlow(page)).toHaveAttribute('data-position', '0.00000')
  await expect(page.locator('.fullscreen')).toBeHidden()
})

test('keeps the primary surface usable at a 390 px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openApp(page)
  const sidebar = page.getByRole('navigation', { name: 'Bookmark folders' })
  await expect(page.getByRole('searchbox')).toBeVisible()
  const sidebarBox = await sidebar.boundingBox()
  const mainBox = await page.locator('main.app-main').boundingBox()
  expect(sidebarBox && mainBox).toBeTruthy()
  // The sidebar wraps above the main column.
  expect(sidebarBox!.y + sidebarBox!.height).toBeLessThanOrEqual(mainBox!.y + 1)
  expect(mainBox!.width).toBeLessThanOrEqual(390)
  expect(
    await page.evaluate(() => document.scrollingElement!.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0)

  await page.locator('.stage').scrollIntoViewIfNeeded()
  await expect(stageTitle(page)).toBeInViewport()
  await page.keyboard.press('ArrowRight')
  await expect(stageTitle(page)).toHaveText('GitHub')
  await sidebarItem(page, 'Reading').click()
  await expect(stageTitle(page)).toHaveText('The Marginalian')
})

test('a failed bookmark read shows a retry state, then a delayed load shows the spinner', async ({
  page,
}) => {
  await page.addInitScript(() => {
    let calls = 0
    const host = window as unknown as { chrome?: Record<string, unknown> }
    host.chrome = {
      ...(host.chrome ?? {}),
      bookmarks: {
        getTree: (): Promise<unknown> => {
          calls += 1
          if (calls === 1) return Promise.reject(new Error('Bookmark access denied in test'))
          return new Promise((resolve) =>
            setTimeout(
              () =>
                resolve([
                  {
                    id: '0',
                    title: '',
                    children: [
                      {
                        id: '1',
                        title: 'Bookmarks Bar',
                        children: [
                          { id: '10', title: 'Example Domain', url: 'https://example.com/' },
                          { id: '11', title: 'Example Org', url: 'https://example.org/' },
                        ],
                      },
                    ],
                  },
                ]),
              900,
            ),
          )
        },
      },
    }
  })
  await page.goto('/')
  const status = page.locator('.stage-status')
  await expect(status).toHaveAttribute('data-kind', 'error')
  await expect(status).toHaveAttribute('role', 'alert')
  await expect(status).toContainText("Can't read Chrome bookmarks")
  await expect(page.getByRole('navigation', { name: 'Bookmark folders' })).toBeVisible()
  await expect(page.getByRole('searchbox', { name: 'Search bookmarks' })).toBeEnabled()

  await status.getByRole('button', { name: 'Retry' }).click()
  await expect(status).toHaveAttribute('data-kind', 'loading')
  await expect(status.locator('.spinner')).toBeVisible()
  await expect(status).toContainText('Loading bookmarks…')
  await expect(stageTitle(page)).toHaveText('Example Domain')
  await expect(status).toBeHidden()
  await expect(page.locator('.title-bar__detail')).toHaveText('2 bookmarks')
  await expect(sidebarItem(page, 'Bookmarks Bar')).toBeVisible()
})

test('a single search match uses singular wording', async ({ page }) => {
  await openApp(page)
  await page.getByRole('searchbox', { name: 'Search bookmarks' }).fill('readwise')
  await expect(page.locator('.title-bar__detail')).toHaveText('1 match for “readwise”')
})
