import { expect, test, type Page } from '@playwright/test'
import { covers, openApp, openSettings } from './helpers'

const photo = {
  name: 'public-test.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=',
    'base64',
  ),
}
const surface = (page: Page) => page.locator('.stage .wallpaper-surface')

async function background(page: Page) {
  const dialog = await openSettings(page, 'Background')
  await expect(page.getByLabel('Choose photo or video')).toBeEnabled()
  return dialog
}

test('photo survives reload, adjustments save, corrupt replacement preserves it, reset is scoped', async ({
  page,
}) => {
  await openApp(page)
  await expect(surface(page)).toHaveAttribute('data-kind', 'gradient')
  await expect(surface(page)).toHaveAttribute('data-preset', 'default')
  const dialog = await background(page)
  await expect(dialog.getByRole('slider', { name: 'Photo blur' })).toBeDisabled()
  await expect(dialog.getByRole('slider', { name: 'Dimming' })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Restore default background' })).toHaveAttribute(
    'aria-disabled',
    'true',
  )
  await page.getByLabel('Choose photo or video').setInputFiles(photo)
  await expect(dialog.locator('.wallpaper-current')).toContainText('public-test.png · 1 × 1')
  await expect(dialog.getByRole('radio', { name: 'Photo or video' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(surface(page)).toHaveAttribute('data-kind', 'image')
  await dialog.getByRole('slider', { name: 'Photo blur' }).fill('4')
  await expect(dialog.getByRole('slider', { name: 'Photo blur' })).toBeEnabled()
  await dialog.getByRole('slider', { name: 'Dimming' }).fill('25')
  await expect(dialog.getByRole('slider', { name: 'Dimming' })).toBeEnabled()
  await expect(surface(page)).toHaveCSS('--photo-blur', '4px')
  await page.reload()
  await expect(surface(page).locator('img')).toBeAttached()
  const reopened = await background(page)
  await expect(reopened.getByRole('slider', { name: 'Photo blur' })).toHaveValue('4')
  await expect(reopened.getByRole('slider', { name: 'Dimming' })).toHaveValue('25')
  const previous = await surface(page).locator('img').getAttribute('src')
  await page.getByLabel('Choose photo or video').setInputFiles({
    name: 'broken.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.from('not a video'),
  })
  await expect(reopened.locator('.wallpaper-error')).toBeVisible()
  await expect(reopened.getByRole('alert')).toContainText('cannot decode')
  await expect(surface(page).locator('img')).toHaveAttribute('src', previous!)
  await expect(reopened.locator('.wallpaper-current')).toContainText('public-test.png')

  // Restoring the background leaves appearance preferences alone.
  await reopened.getByRole('tab', { name: 'Appearance' }).click()
  await reopened.getByRole('radio', { name: 'Dark', exact: true }).click()
  await reopened.getByRole('tab', { name: 'Background' }).click()
  await reopened.getByRole('button', { name: 'Restore default background' }).click()
  await expect(surface(page).locator('img')).toHaveCount(0)
  await expect(surface(page)).toHaveAttribute('data-kind', 'gradient')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(covers(page)).not.toHaveCount(0)
  await expect(surface(page)).toHaveAttribute('data-kind', 'gradient')
  await expect(surface(page)).toHaveAttribute('data-preset', 'default')
})

test('Mist and Night presets apply to the stage, persist and can be restored', async ({ page }) => {
  await openApp(page)
  const dialog = await background(page)
  const defaultBackground = await surface(page).evaluate(
    (element) => getComputedStyle(element).backgroundImage,
  )
  await dialog.getByRole('radio', { name: 'Mist', exact: true }).click()
  await expect(surface(page)).toHaveAttribute('data-preset', 'mist')
  await expect(surface(page)).toHaveAttribute('data-kind', 'gradient')
  await expect(dialog.getByRole('radio', { name: 'Mist', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  const mist = await surface(page).evaluate((element) => getComputedStyle(element).backgroundImage)
  expect(mist).not.toBe(defaultBackground)

  // Arrow keys move between tiles without moving the covers.
  await dialog.getByRole('radio', { name: 'Mist', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(surface(page)).toHaveAttribute('data-preset', 'night')
  const night = await surface(page).evaluate((element) => getComputedStyle(element).backgroundImage)
  expect(night).not.toBe(mist)
  await expect(page.locator('.stage .cover-flow')).toHaveAttribute('data-position', '0.00000')

  await page.reload()
  await expect(surface(page)).toHaveAttribute('data-preset', 'night')
  const reopened = await background(page)
  await expect(reopened.getByRole('radio', { name: 'Night', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  // A preset replaces a stored photo.
  await page.getByLabel('Choose photo or video').setInputFiles(photo)
  await expect(surface(page)).toHaveAttribute('data-kind', 'image')
  await reopened.getByRole('radio', { name: 'Mist', exact: true }).click()
  await expect(surface(page)).toHaveAttribute('data-preset', 'mist')
  await expect(surface(page).locator('img')).toHaveCount(0)
  await expect(reopened.locator('.wallpaper-current')).toBeHidden()

  await reopened.getByRole('button', { name: 'Restore default background' }).click()
  await expect(surface(page)).toHaveAttribute('data-preset', 'default')
  await page.reload()
  await expect(surface(page)).toHaveAttribute('data-preset', 'default')
})

test('atomic storage failure leaves the saved photo intact', async ({ page }) => {
  await openApp(page)
  const dialog = await background(page)
  await page.getByLabel('Choose photo or video').setInputFiles(photo)
  await expect(dialog.locator('.wallpaper-current')).toContainText(photo.name)
  await page.evaluate(() => {
    // Keep the receiver explicit while injecting a quota failure into the real transaction.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const original = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (value, key) {
      if (key === 'media') throw new DOMException('Test disk quota reached', 'QuotaExceededError')
      return original.call(this, value, key)
    }
  })
  await page
    .getByLabel('Choose photo or video')
    .setInputFiles({ ...photo, name: 'replacement.png' })
  await expect(dialog.getByRole('alert')).toContainText('quota')
  await expect(dialog.locator('.wallpaper-current')).toContainText(photo.name)
  await page.reload()
  const reopened = await background(page)
  await expect(reopened.locator('.wallpaper-current')).toContainText(photo.name)
  await expect(surface(page).locator('img')).toBeAttached()
})

test('native video loops silently, pauses persist and settings do not replace playback DOM', async ({
  page,
}) => {
  test.skip(
    !process.env.WALLPAPER_TEST_VIDEO,
    'Provide a decoded video fixture for native media tests',
  )
  await openApp(page)
  const dialog = await background(page)
  await page.getByLabel('Choose photo or video').setInputFiles(process.env.WALLPAPER_TEST_VIDEO!)
  const video = surface(page).locator('video')
  await expect(video).toBeAttached()
  await expect
    .poll(() =>
      video.evaluate((v: HTMLVideoElement) => v.getVideoPlaybackQuality().totalVideoFrames),
    )
    .toBeGreaterThan(2)
  expect(
    await video.evaluate((v: HTMLVideoElement) => ({
      muted: v.muted,
      defaultMuted: v.defaultMuted,
      volume: v.volume,
      loop: v.loop,
      inline: v.playsInline,
      filter: getComputedStyle(v).filter,
      parentFilter: getComputedStyle(v.parentElement!).filter,
    })),
  ).toEqual({
    muted: true,
    defaultMuted: true,
    volume: 0,
    loop: true,
    inline: true,
    filter: 'none',
    parentFilter: 'none',
  })
  await expect(dialog.getByRole('slider', { name: 'Photo blur' })).toBeDisabled()
  const source = await video.getAttribute('src')
  await dialog.getByRole('tab', { name: 'Appearance' }).click()
  await dialog.getByRole('tab', { name: 'Background' }).click()
  await expect(video).toHaveAttribute('src', source!)
  await dialog.getByRole('button', { name: 'Pause video' }).click()
  await expect(dialog.getByRole('button', { name: 'Play video' })).toBeEnabled()
  await page.reload()
  await expect(video).toBeAttached()
  expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true)
  const reopened = await background(page)
  await reopened.getByRole('button', { name: 'Play video' }).click()
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(0.1)
})
