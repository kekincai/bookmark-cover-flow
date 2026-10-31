import { expect, type Locator, type Page } from '@playwright/test'

/** The demo library shown by the dev server: 19 bookmarks under "All Bookmarks". */
export const DEMO_TOTAL = 19

export const stageTitle = (page: Page): Locator => page.locator('.stage .bookmark-meta__title')
export const coverFlow = (page: Page): Locator => page.locator('.stage .cover-flow')
export const covers = (page: Page): Locator => page.locator('.stage .cover-card')
export const listRows = (page: Page): Locator => page.locator('.bookmark-list__row[data-index]')
export const sidebarItem = (page: Page, name: string): Locator =>
  page.locator('nav.sidebar .sidebar-item', {
    has: page.locator('.sidebar-item__title', { hasText: new RegExp(`^${name}$`) }),
  })

/** Wait for the first render of the demo library. */
export async function openApp(page: Page): Promise<void> {
  await page.goto('/')
  await expect(stageTitle(page)).toHaveText('Design Notes')
  await expect(page.locator('.title-bar__title')).toHaveText('All Bookmarks')
}

export async function position(page: Page): Promise<number> {
  return Number(await coverFlow(page).getAttribute('data-position'))
}

/** Records every `data-position` the stage renders from now on. */
export async function recordPositions(page: Page): Promise<void> {
  await page.evaluate(() => {
    const flow = document.querySelector<HTMLElement>('.stage .cover-flow')!
    const seen: string[] = []
    ;(window as unknown as { __positions: string[] }).__positions = seen
    new MutationObserver(() => seen.push(flow.dataset.position ?? '')).observe(flow, {
      attributes: true,
      attributeFilter: ['data-position'],
    })
  })
}

export async function recordedPositions(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __positions: string[] }).__positions)
}

export async function openSettings(page: Page, tab?: 'Appearance' | 'Background' | 'Privacy') {
  await page.getByRole('button', { name: 'Open settings' }).click()
  const dialog = page.getByRole('dialog', { name: 'Settings' })
  await expect(dialog).toBeVisible()
  if (tab) await dialog.getByRole('tab', { name: tab }).click()
  return dialog
}
