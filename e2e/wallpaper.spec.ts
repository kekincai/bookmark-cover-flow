import { expect, test, type Page } from '@playwright/test'

const photo = {
  name: 'public-test.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=',
    'base64',
  ),
}
async function background(page: Page) {
  await page.getByRole('button', { name: 'View options' }).click()
  await page.getByRole('tab', { name: 'Background' }).click()
  await expect(page.getByLabel('Choose photo or video')).toBeEnabled()
}
test('photo survives reload, adjustments save, corrupt replacement preserves it, reset is scoped', async ({
  page,
}) => {
  await page.goto('/')
  await background(page)
  await page.getByLabel('Choose photo or video').setInputFiles(photo)
  await expect(page.locator('.wallpaper-current')).toContainText('public-test.png · 1 × 1')
  await page.getByRole('slider', { name: 'Photo blur' }).fill('4')
  await expect(page.getByRole('slider', { name: 'Photo blur' })).toBeEnabled()
  await page.getByRole('slider', { name: 'Dimming' }).fill('25')
  await expect(page.getByRole('slider', { name: 'Dimming' })).toBeEnabled()
  await page.reload()
  await expect(page.locator('.wallpaper-surface img')).toBeVisible()
  await background(page)
  await expect(page.getByRole('slider', { name: 'Photo blur' })).toHaveValue('4')
  await expect(page.getByRole('slider', { name: 'Dimming' })).toHaveValue('25')
  const previous = await page.locator('.wallpaper-surface img').getAttribute('src')
  await page.getByLabel('Choose photo or video').setInputFiles({
    name: 'broken.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.from('not a video'),
  })
  await expect(page.getByRole('alert')).toContainText('cannot decode')
  await expect(page.locator('.wallpaper-surface img')).toHaveAttribute('src', previous!)
  await expect(page.locator('.wallpaper-current')).toContainText('public-test.png')
  await page.getByRole('tab', { name: 'Appearance' }).click()
  await page.getByRole('radio', { name: 'Dark', exact: true }).click()
  await page.getByRole('tab', { name: 'Background' }).click()
  await page.getByRole('button', { name: 'Restore default background' }).click()
  await expect(page.locator('.wallpaper-surface img')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('.cover-card')).not.toHaveCount(0)
  await expect(page.locator('.wallpaper-surface')).toHaveAttribute('data-kind', 'gradient')
})

test('drawer isolates focus, uses keyboard tabs and Escape restores the trigger', async ({
  page,
}) => {
  await page.goto('/')
  await background(page)
  await expect(page.locator('#app')).toHaveAttribute('inert', '')
  await page.keyboard.press('ArrowUp')
  await expect(page.getByRole('tab', { name: 'Appearance' })).toBeFocused()
  await page.getByRole('button', { name: 'Close settings' }).focus()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByLabel('Show reflection')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Close settings' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByRole('button', { name: 'View options' })).toBeFocused()
  await expect(page.locator('#app')).not.toHaveAttribute('inert', '')
  await expect(page.locator('.interaction-hint')).toHaveCount(0)
})

test('atomic storage failure leaves the saved photo intact', async ({ page }) => {
  await page.goto('/')
  await background(page)
  await page.getByLabel('Choose photo or video').setInputFiles(photo)
  await expect(page.locator('.wallpaper-current')).toContainText(photo.name)
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
  await expect(page.getByRole('alert')).toContainText('quota')
  await expect(page.locator('.wallpaper-current')).toContainText(photo.name)
  await page.reload()
  await background(page)
  await expect(page.locator('.wallpaper-current')).toContainText(photo.name)
  await expect(page.locator('.wallpaper-surface img')).toBeVisible()
})

test('native video loops silently, pauses persist and settings do not replace playback DOM', async ({
  page,
}) => {
  test.skip(
    !process.env.WALLPAPER_TEST_VIDEO,
    'Provide a decoded video fixture for native media tests',
  )
  await page.goto('/')
  await background(page)
  await page.getByLabel('Choose photo or video').setInputFiles(process.env.WALLPAPER_TEST_VIDEO!)
  const video = page.locator('.wallpaper-surface video')
  await expect(video).toBeVisible()
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
  await expect(page.getByRole('slider', { name: 'Photo blur' })).toBeDisabled()
  const source = await video.getAttribute('src')
  await page.getByRole('tab', { name: 'Appearance' }).click()
  await page.getByRole('tab', { name: 'Background' }).click()
  await expect(video).toHaveAttribute('src', source!)
  await page.getByRole('button', { name: 'Pause video' }).click()
  await expect(page.getByRole('button', { name: 'Play video' })).toBeEnabled()
  await page.reload()
  await expect(video).toBeVisible()
  expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true)
  await background(page)
  await page.getByRole('button', { name: 'Play video' }).click()
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(0.1)
})
