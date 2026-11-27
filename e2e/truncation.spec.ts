import { expect, test } from '@playwright/test'
import { openApp } from './helpers'

test('a truncated title scrolls its hidden end into view on hover, and only then', async ({
  page,
}) => {
  await openApp(page)
  const item = page.locator('nav.sidebar .sidebar-item').nth(3)
  const title = item.locator('.sidebar-item__title')
  await title.evaluate((element) => {
    element.firstElementChild!.textContent =
      'An extremely long folder name that cannot possibly fit in the sidebar'
  })
  const inner = title.locator('span')
  const truncated = (): Promise<string> =>
    title.evaluate((element) => getComputedStyle(element).getPropertyValue('--truncated'))
  // At rest no scroll timeline runs (it cost frames while scrubbing large libraries).
  expect(await truncated()).toBe('0')
  await item.hover()
  await expect.poll(truncated).toBe('1')
  await expect
    .poll(() => inner.evaluate((element) => getComputedStyle(element).display))
    .toBe('inline-block')
  await page.mouse.move(0, 0)
  await expect
    .poll(() => inner.evaluate((element) => getComputedStyle(element).display))
    .toBe('inline')
})
