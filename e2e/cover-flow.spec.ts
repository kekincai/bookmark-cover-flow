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

test('sorts bookmarks and persists appearance settings', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'View options' }).click()
  await page.getByRole('radio', { name: 'Title', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Apple Developer' })).toBeVisible()

  await page.getByRole('radio', { name: 'Dark', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByLabel('Show reflection').uncheck()
  await expect(page.locator('html')).toHaveAttribute('data-reflection', 'false')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).toHaveAttribute('data-reflection', 'false')
  await expect(page.getByRole('heading', { name: 'Apple Developer' })).toBeVisible()
})

test('shows locally recorded recent bookmarks', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'bookmark-cover-flow-recent',
      JSON.stringify([
        {
          id: 'demo-3',
          title: 'Figma',
          url: 'https://figma.com',
          openedAt: 200,
        },
        {
          id: 'demo-2',
          title: 'GitHub',
          url: 'https://github.com',
          openedAt: 100,
        },
      ]),
    )
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Recent' }).click()
  await expect(page.getByRole('heading', { name: 'Figma' })).toBeVisible()
  await expect(page.locator('.cover-card')).toHaveCount(2)
})

test('exposes virtual position metadata and page navigation', async ({ page }) => {
  await page.goto('/')
  const first = page.locator('.cover-card').first()
  await expect(first).toHaveAttribute('aria-setsize', '9')
  await expect(first).toHaveAttribute('aria-posinset', '1')
  await page.keyboard.press('PageDown')
  await expect(page.getByRole('heading', { name: 'Linear' })).toBeVisible()
})

test('keeps the primary surface usable at a mobile-sized viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Design Notes' })).toBeVisible()
  await expect(page.getByRole('searchbox')).toBeVisible()
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
})

test('honors reduced motion while keeping keyboard navigation functional', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('heading', { name: 'GitHub' })).toBeVisible()
  const reflection = await page
    .locator('.cover-card')
    .first()
    .evaluate((element) => getComputedStyle(element).getPropertyValue('-webkit-box-reflect'))
  expect(['none', '']).toContain(reflection)
})
