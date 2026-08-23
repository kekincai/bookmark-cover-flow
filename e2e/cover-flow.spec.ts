import { expect, test } from '@playwright/test'

test('loads demo bookmarks and supports the primary keyboard and search flow', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })

  await page.goto('/')
  await expect(page).toHaveTitle('Bookmark Cover Flow')
  await expect(page.getByRole('heading', { name: 'Design Notes' })).toBeVisible()
  await expect(page.locator('.cover-card')).toHaveCount(8)

  const github = page.getByRole('button', { name: 'GitHub, github.com' })
  const visiblePoint = await github.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    for (let x = bounds.left + 4; x < bounds.right; x += 8) {
      for (let y = bounds.top + 4; y < bounds.bottom; y += 8) {
        if (document.elementFromPoint(x, y)?.closest('.cover-card') === element) return { x, y }
      }
    }
    return null
  })
  expect(visiblePoint).not.toBeNull()
  if (visiblePoint === null) throw new Error('The adjacent GitHub cover has no clickable area.')

  await page.mouse.click(visiblePoint.x, visiblePoint.y)
  await expect(page.getByRole('heading', { name: 'GitHub' })).toBeVisible()

  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('heading', { name: 'Figma' })).toBeVisible()

  await page.keyboard.press('/')
  const search = page.getByRole('searchbox', { name: 'Search bookmarks' })
  await expect(search).toBeFocused()
  await search.fill('figma')
  await expect(page.locator('.cover-card')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Figma' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.locator('.cover-card')).toHaveCount(8)
  expect(errors).toEqual([])
})

test('switches bookmark folders without leaving Cover Flow', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Reading' }).click()
  await expect(page.getByRole('heading', { name: 'The Marginalian' })).toBeVisible()
  await expect(page.locator('.cover-card')).toHaveCount(3)
})

test('keeps the primary surface usable at a mobile-sized viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Design Notes' })).toBeVisible()
  await expect(page.getByRole('searchbox')).toBeVisible()
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
})
