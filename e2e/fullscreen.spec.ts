import { expect, test } from '@playwright/test'
import { DEMO_TOTAL, coverFlow, openApp, stageTitle } from './helpers'

test('F toggles full-screen Cover Flow, which stays in sync with the stage', async ({ page }) => {
  await openApp(page)
  const fullscreen = page.locator('.fullscreen')
  await expect(fullscreen).toBeHidden()
  await expect(fullscreen).toHaveAttribute('role', 'dialog')

  await page.keyboard.press('f')
  await expect(fullscreen).toBeVisible()
  await expect(page.locator('#app')).toHaveAttribute('inert', '')
  const close = page.getByRole('button', { name: 'Exit full screen' })
  await expect(close).toBeFocused()
  await expect(page.locator('.fullscreen__heading')).toHaveText(`All Bookmarks · 1 / ${DEMO_TOTAL}`)
  await expect(fullscreen.locator('.bookmark-meta__title')).toHaveText('Design Notes')
  await expect(fullscreen.locator('.cover-card[aria-current="true"]')).toHaveAttribute(
    'aria-label',
    'Design Notes, notion.so',
  )
  const coverSize = await fullscreen
    .locator('.cover-card')
    .first()
    .evaluate((element) => (element as HTMLElement).offsetWidth)
  expect(coverSize).toBe(340)

  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.fullscreen__heading')).toHaveText(`All Bookmarks · 2 / ${DEMO_TOTAL}`)
  await expect(fullscreen.locator('.bookmark-meta__title')).toHaveText('GitHub')
  await expect(fullscreen.locator('.cover-flow')).toHaveAttribute('data-position', '1.00000')
  await fullscreen.getByRole('button', { name: 'Next bookmark' }).first().click()
  await expect(fullscreen.locator('.bookmark-meta__title')).toHaveText('Figma')
  // Glow color comes from the current cover.
  expect(await fullscreen.evaluate((element) => element.style.getPropertyValue('--glow'))).toMatch(
    /^#[0-9A-F]{6}$/i,
  )

  // Tab stays inside the overlay.
  for (let step = 0; step < 8; step += 1) await page.keyboard.press('Tab')
  expect(
    await page.evaluate(() =>
      document.querySelector('.fullscreen')!.contains(document.activeElement),
    ),
  ).toBe(true)

  await page.keyboard.press('F')
  await expect(fullscreen).toBeHidden()
  await expect(page.locator('#app')).not.toHaveAttribute('inert', '')
  await expect(stageTitle(page)).toHaveText('Figma')
  await expect(coverFlow(page)).toHaveAttribute('data-position', '2.00000')
})

test('the title-bar button enters and Escape or the close button exits', async ({ page }) => {
  await openApp(page)
  const fullscreen = page.locator('.fullscreen')
  const enter = page.getByRole('button', { name: 'Full-screen Cover Flow' })
  await page.getByRole('searchbox', { name: 'Search bookmarks' }).fill('git')
  await enter.click()
  await expect(fullscreen).toBeVisible()
  await expect(page.locator('.fullscreen__heading')).toHaveText('All Bookmarks · 1 / 2')

  // Escape leaves full screen first and keeps the search.
  await page.keyboard.press('Escape')
  await expect(fullscreen).toBeHidden()
  await expect(enter).toBeFocused()
  await expect(page.getByRole('searchbox', { name: 'Search bookmarks' })).toHaveValue('git')

  await enter.click()
  await expect(fullscreen).toBeVisible()
  await page.getByRole('button', { name: 'Exit full screen' }).click()
  await expect(fullscreen).toBeHidden()
  await expect(enter).toBeFocused()
})

test('opening from full screen opens the centered bookmark', async ({ page, context }) => {
  await context.route('https://www.notion.so/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>Notion fixture</title>' }),
  )
  await openApp(page)
  await page.keyboard.press('f')
  const opened = context.waitForEvent('page')
  await page.locator('.fullscreen__open').click()
  await expect(page.locator('.fullscreen__open')).toContainText('Opening…')
  const tab = await opened
  await expect.poll(() => tab.url()).toContain('notion.so')
  await tab.close()
})
