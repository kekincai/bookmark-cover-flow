import { expect, test, type Page } from '@playwright/test'
import { DEMO_TOTAL, listRows, openApp, position, stageTitle } from './helpers'

const viewButton = (page: Page, name: 'Cover Flow' | 'Grid' | 'List') =>
  page.getByRole('group', { name: 'View' }).getByRole('button', { name, exact: true })

test('switches between Cover Flow, Grid and List and remembers the choice', async ({ page }) => {
  await openApp(page)
  await expect(viewButton(page, 'Cover Flow')).toHaveAttribute('aria-pressed', 'true')

  await viewButton(page, 'Grid').click()
  await expect(viewButton(page, 'Grid')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.bookmark-grid')).toBeVisible()
  await expect(page.locator('.stage')).toBeHidden()
  await expect(page.locator('.bookmark-list')).toBeHidden()
  await expect(page.locator('.grid-cell').first()).toHaveAttribute(
    'aria-label',
    'Design Notes, notion.so',
  )

  await viewButton(page, 'List').click()
  await expect(page.locator('.bookmark-list')).toBeVisible()
  await expect(page.locator('.stage')).toBeHidden()
  await expect(page.locator('.bookmark-grid')).toBeHidden()

  await page.reload()
  await expect(viewButton(page, 'List')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.stage')).toBeHidden()

  await viewButton(page, 'Cover Flow').click()
  await expect(page.locator('.stage')).toBeVisible()
  await expect(page.locator('.bookmark-list')).toBeVisible()
})

test('the grid selects instantly, moves by rows and keeps Cover Flow in sync', async ({ page }) => {
  await openApp(page)
  await viewButton(page, 'Grid').click()
  const countColumns = (): Promise<number> =>
    page.locator('.grid-cell').evaluateAll((cells) => {
      const firstTop = cells[0]?.getBoundingClientRect().top
      return cells.filter((cell) => cell.getBoundingClientRect().top === firstTop).length
    })
  // The grid lays itself out when it first becomes visible.
  await expect.poll(countColumns).toBeGreaterThan(1)
  const columns = await countColumns()
  expect(columns).toBeGreaterThan(1)

  await page.locator('.grid-cell').nth(2).click()
  await expect(page.locator('.grid-cell.is-selected')).toHaveAttribute('data-index', '2')
  expect(await position(page)).toBe(2)

  await page.keyboard.press('ArrowDown')
  await expect(page.locator('.grid-cell.is-selected')).toHaveAttribute(
    'data-index',
    String(2 + columns),
  )
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('.grid-cell.is-selected')).toHaveAttribute(
    'data-index',
    String(1 + columns),
  )
  await page.keyboard.press('End')
  await expect(page.locator('.grid-cell.is-selected')).toHaveAttribute(
    'data-index',
    String(DEMO_TOTAL - 1),
  )
  expect(await position(page)).toBe(DEMO_TOTAL - 1)

  await viewButton(page, 'Cover Flow').click()
  await expect(stageTitle(page)).toHaveText('Longreads')
})

test('the grid and list show the empty and no-results states', async ({ page }) => {
  await openApp(page)
  await viewButton(page, 'Grid').click()
  await page.getByRole('searchbox', { name: 'Search bookmarks' }).fill('zzzz-nothing')
  await expect(page.locator('.stage-status--browse')).toContainText('No results for “zzzz-nothing”')
  await viewButton(page, 'List').click()
  await expect(page.locator('.stage-status--browse')).toBeVisible()
  await page.getByRole('searchbox', { name: 'Search bookmarks' }).fill('')
  await expect(page.locator('.stage-status--browse')).toBeHidden()
  await expect(listRows(page).first()).toBeVisible()
})

test('F still opens full-screen Cover Flow from the grid', async ({ page }) => {
  await openApp(page)
  await viewButton(page, 'Grid').click()
  await page.locator('.grid-cell').nth(3).click()
  await page.keyboard.press('f')
  await expect(page.locator('.fullscreen .bookmark-meta__title')).toHaveText('Readwise')
  await page.keyboard.press('Escape')
  await expect(page.locator('.fullscreen')).toBeHidden()
})
