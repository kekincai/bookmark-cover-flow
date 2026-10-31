import { expect, test } from '@playwright/test'
import {
  coverFlow,
  covers,
  openApp,
  openSettings,
  recordPositions,
  recordedPositions,
  sidebarItem,
  stageTitle,
} from './helpers'

test('settings tabs, focus trap and Escape return focus to the gear', async ({ page }) => {
  await openApp(page)
  const gear = page.getByRole('button', { name: 'Open settings' })
  await expect(gear).toHaveAttribute('aria-expanded', 'false')
  const dialog = await openSettings(page)
  await expect(gear).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('#app')).toHaveAttribute('inert', '')
  // Measure once the open transition has settled.
  await expect.poll(async () => Math.round((await dialog.boundingBox())?.width ?? 0)).toBe(760)

  const appearance = dialog.getByRole('tab', { name: 'Appearance' })
  const background = dialog.getByRole('tab', { name: 'Background' })
  const privacy = dialog.getByRole('tab', { name: 'Privacy' })
  await expect(appearance).toBeFocused()
  await expect(appearance).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#settings-pane-appearance')).toBeVisible()

  // Arrow keys move between tabs (wrapping) and never reach the covers.
  await page.keyboard.press('ArrowRight')
  await expect(background).toBeFocused()
  await expect(background).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#settings-pane-background')).toBeVisible()
  await expect(page.locator('#settings-pane-appearance')).toBeHidden()
  await page.keyboard.press('ArrowRight')
  await expect(privacy).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(appearance).toBeFocused()
  await page.keyboard.press('End')
  await expect(privacy).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Home')
  await expect(appearance).toHaveAttribute('aria-selected', 'true')
  await expect(coverFlow(page)).toHaveAttribute('data-position', '0.00000')

  // Tab wraps from Done back to the selected tab, and Shift+Tab wraps the other way.
  const done = dialog.getByRole('button', { name: 'Done' })
  await done.focus()
  await page.keyboard.press('Tab')
  await expect(appearance).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(done).toBeFocused()
  for (let step = 0; step < 12; step += 1) await page.keyboard.press('Tab')
  expect(
    await page.evaluate(() =>
      document.querySelector('.settings-dialog')!.contains(document.activeElement),
    ),
  ).toBe(true)

  // Theme tiles are a radio group: arrows pick, and shortcuts stay inert inside the dialog.
  await dialog.getByRole('radio', { name: 'Light', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(dialog.getByRole('radio', { name: 'Dark', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.keyboard.press('f')
  await expect(page.locator('.fullscreen')).toBeHidden()
  await expect(coverFlow(page)).toHaveAttribute('data-position', '0.00000')

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(gear).toBeFocused()
  await expect(gear).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('#app')).not.toHaveAttribute('inert', '')

  // Reopening keeps the last tab; Done and the backdrop close it too.
  await gear.click()
  await expect(dialog).toBeVisible()
  await done.click()
  await expect(dialog).toBeHidden()
  await expect(gear).toBeFocused()
  await gear.click()
  await page.mouse.click(10, 10)
  await expect(dialog).toBeHidden()
})

test('cover angle, reflection, theme and sort persist across reload', async ({ page }) => {
  await openApp(page)
  const html = page.locator('html')
  await expect(html).toHaveAttribute('data-theme', 'light')
  await expect(html).toHaveAttribute('data-reflection', 'true')
  const sideCover = page.locator('.stage .cover-card[data-index="1"]')
  await expect(sideCover).toHaveAttribute('style', /rotateY\(70deg\)/)
  const dialog = await openSettings(page)

  const angle = dialog.getByRole('slider', { name: 'Cover angle' })
  await expect(angle).toHaveValue('70')
  await expect(angle).toHaveAttribute('min', '45')
  await expect(angle).toHaveAttribute('max', '80')
  await angle.fill('50')
  await expect(angle).toHaveAttribute('aria-valuetext', '50°')
  await expect(sideCover).toHaveAttribute('style', /rotateY\(50deg\)/)

  const reflection = dialog.getByRole('switch', { name: 'Cover reflection' })
  await expect(reflection).toBeChecked()
  await reflection.uncheck()
  await expect(html).toHaveAttribute('data-reflection', 'false')
  expect(
    await page
      .locator('.stage .cover-card__art')
      .first()
      .evaluate((element) => getComputedStyle(element).getPropertyValue('-webkit-box-reflect')),
  ).toMatch(/^(none|)$/)

  await dialog.getByRole('radio', { name: 'Dark', exact: true }).click()
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await expect(dialog.getByRole('radio', { name: 'Dark', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  )

  await dialog.getByLabel('Sort bookmarks').selectOption('title')
  await expect(stageTitle(page)).toHaveText('Aeon')

  await page.reload()
  await expect(stageTitle(page)).toHaveText('Aeon')
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await expect(html).toHaveAttribute('data-reflection', 'false')
  await expect(sideCover).toHaveAttribute('style', /rotateY\(50deg\)/)
  const reopened = await openSettings(page)
  await expect(reopened.getByRole('slider', { name: 'Cover angle' })).toHaveValue('50')
  await expect(reopened.getByRole('switch', { name: 'Cover reflection' })).not.toBeChecked()
  await expect(reopened.getByLabel('Sort bookmarks')).toHaveValue('title')

  // Auto follows the system: no data-theme attribute, even after reload.
  await reopened.getByRole('radio', { name: 'Auto', exact: true }).click()
  await expect(html).not.toHaveAttribute('data-theme', /.*/)
  await page.reload()
  await expect(stageTitle(page)).toHaveText('Aeon')
  await expect(html).not.toHaveAttribute('data-theme', /.*/)
  await page.emulateMedia({ colorScheme: 'dark' })
  const darkSidebar = await page
    .locator('nav.sidebar')
    .evaluate((element) => getComputedStyle(element).backgroundColor)
  await page.emulateMedia({ colorScheme: 'light' })
  const lightSidebar = await page
    .locator('nav.sidebar')
    .evaluate((element) => getComputedStyle(element).backgroundColor)
  expect(darkSidebar).not.toBe(lightSidebar)
})

test('preview preference: turning it off generates every cover locally', async ({ page }) => {
  await openApp(page)
  const dialog = await openSettings(page)
  const prefer = dialog.getByRole('switch', { name: 'Prefer website preview images' })
  await expect(prefer).toBeChecked()
  await prefer.uncheck()
  await page.keyboard.press('Escape')
  await expect(covers(page).first()).toHaveAttribute('data-state', 'generated')
  expect(
    await covers(page).evaluateAll((cards) =>
      cards.every((card) => (card as HTMLElement).dataset.state === 'generated'),
    ),
  ).toBe(true)
  await page.reload()
  const reopened = await openSettings(page)
  await expect(
    reopened.getByRole('switch', { name: 'Prefer website preview images' }),
  ).not.toBeChecked()
})

test('reduced motion lands immediately with a cross-fade and keeps the reflection', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openApp(page)
  await recordPositions(page)
  await page.keyboard.press('ArrowRight')
  await expect(stageTitle(page)).toHaveText('GitHub')
  await page.keyboard.press('End')
  await expect(coverFlow(page)).toHaveAttribute('data-position', '18.00000')
  await page.waitForTimeout(200)
  // Only whole positions were ever rendered: no rotation animation in between.
  expect(new Set(await recordedPositions(page))).toEqual(new Set(['1.00000', '18.00000']))
  const reflection = await page
    .locator('.stage .cover-card__art')
    .first()
    .evaluate((element) => getComputedStyle(element).getPropertyValue('-webkit-box-reflect'))
  expect(reflection).toContain('linear-gradient')
})

test('the Reduce flip animation setting jumps without system Reduce Motion', async ({ page }) => {
  await openApp(page)
  const dialog = await openSettings(page)
  await dialog.getByRole('switch', { name: 'Reduce flip animation' }).check()
  await expect(page.locator('html')).toHaveAttribute('data-reduce-flip', 'true')
  await page.keyboard.press('Escape')
  // Focus returns to the gear in the sidebar, whose arrow keys are its own; move to the stage.
  await page.locator('.stage .cover-card[aria-current="true"]').focus()
  await recordPositions(page)
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('PageDown')
  await expect(coverFlow(page)).toHaveAttribute('data-position', '7.00000')
  await page.waitForTimeout(200)
  expect(await recordedPositions(page)).toEqual(['1.00000', '2.00000', '7.00000'])
  // The stage cross-fades (150 ms) instead of rotating.
  await page.evaluate(() => {
    const durations: unknown[] = []
    ;(window as unknown as { __fades: unknown[] }).__fades = durations
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const animate = Element.prototype.animate
    Element.prototype.animate = function (keyframes, options) {
      if (this.classList.contains('cover-flow__stage'))
        durations.push(typeof options === 'number' ? options : options?.duration)
      return animate.call(this, keyframes, options)
    }
  })
  await page.keyboard.press('ArrowLeft')
  await expect(coverFlow(page)).toHaveAttribute('data-position', '6.00000')
  expect(await page.evaluate(() => (window as unknown as { __fades: unknown[] }).__fades)).toEqual([
    150,
  ])
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-reduce-flip', 'true')
})

test('privacy tab clears the recently opened history', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', 'true')
    localStorage.setItem(
      'bookmark-cover-flow-recent',
      JSON.stringify([{ id: 'demo-3', title: 'Figma', url: 'https://figma.com', openedAt: 200 }]),
    )
  })
  await openApp(page)
  const count = sidebarItem(page, 'Recently Opened').locator('.sidebar-item__count')
  await expect(count).toHaveText('1')
  const dialog = await openSettings(page, 'Privacy')
  await expect(dialog).toContainText('Bookmarks never leave this computer')
  await expect(dialog).toContainText('No analytics or tracking')
  // The preview cache lives in the extension only; the dev server shows just the history row.
  await expect(dialog.getByRole('button', { name: 'Clear' })).toHaveCount(1)
  await dialog.getByRole('button', { name: 'Clear' }).click()
  await expect(dialog).toContainText('Cleared')
  await expect(count).toHaveText('0')
  await page.reload()
  await expect(count).toHaveText('0')
})
