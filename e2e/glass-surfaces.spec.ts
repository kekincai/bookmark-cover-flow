import { expect, test } from '@playwright/test'

for (const theme of ['Light', 'Dark']) {
  test(`${theme}: settings stay single-column and card media has no opaque backing`, async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'View options' }).click()
    await page.getByRole('radio', { name: theme, exact: true }).click()
    const tabs = await page.getByRole('tablist').boundingBox()
    const pane = await page.getByRole('tabpanel').boundingBox()
    expect(tabs).not.toBeNull()
    expect(pane).not.toBeNull()
    expect(pane!.y).toBeGreaterThan(tabs!.y + tabs!.height)
    expect(pane!.width).toBeCloseTo(tabs!.width, 0)
    for (const selector of [
      '.cover-card',
      '.cover-card__media',
      '.cover-card__fallback',
      '.settings-group',
    ]) {
      await expect(page.locator(selector).first()).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    }
    await expect(page.getByRole('tablist')).toHaveAttribute('aria-orientation', 'horizontal')
    await page.getByRole('tab', { name: 'Appearance' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('tab', { name: 'Background' })).toBeFocused()
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByRole('tab', { name: 'Appearance' })).toBeFocused()
  })
}

test('decoded video frames visibly change inside a stationary glass card', async ({
  page,
}, testInfo) => {
  test.skip(!process.env.WALLPAPER_TEST_VIDEO, 'Requires a real video fixture')
  await page.goto('/')
  await page.getByRole('button', { name: 'View options' }).click()
  await page.getByRole('tab', { name: 'Background' }).click()
  await page.getByLabel('Choose photo or video').setInputFiles(process.env.WALLPAPER_TEST_VIDEO!)
  const video = page.locator('.wallpaper-surface video')
  await expect(video).toBeVisible()
  await page.getByRole('button', { name: 'Pause video' }).click()
  await page.getByRole('button', { name: 'Close settings' }).click()
  await expect(page.locator('.settings-drawer')).toBeHidden()
  await expect(page.locator('.cover-flow')).toHaveAttribute('data-position', '0.00000')
  const card = page.locator('.cover-card[aria-current="true"]')
  const box = await card.boundingBox()
  if (!box) throw new Error('Missing central card')
  // An empty patch inside the media window, away from text, borders and other cards.
  const clip = { x: box.x + 32, y: box.y + 32, width: 32, height: 32 }
  const frames: Buffer[] = []
  for (const fraction of [0.15, 0.7]) {
    await video.evaluate(async (element: HTMLVideoElement, at) => {
      await new Promise<void>((resolve) => {
        element.addEventListener('seeked', () => resolve(), { once: true })
        element.currentTime = element.duration * at
      })
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      )
    }, fraction)
    frames.push(await page.screenshot({ clip }))
  }
  const [first, second] = frames
  if (!first || !second) throw new Error('Both decoded video frames are required')
  expect(first.equals(second)).toBe(false)
  for (const [i, frame] of frames.entries()) {
    await testInfo.attach(`glass-interior-frame-${i}`, {
      body: frame,
      contentType: 'image/png',
    })
  }
  expect(await video.evaluate((v: HTMLVideoElement) => v.muted && v.volume === 0)).toBe(true)
  await expect(card.locator('.cover-card__media')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
})
