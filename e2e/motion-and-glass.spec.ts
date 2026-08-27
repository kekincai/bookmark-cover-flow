import { expect, test } from '@playwright/test'
import type { CoverFlowView } from '../src/ui/components/cover-flow'
import type * as HdrModule from '../src/ui/effects/hdr-glass'

test('the unchanged HDR shader compiles on an available real WebGPU device', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const adapter = await navigator.gpu?.requestAdapter()
    if (!adapter) return { available: false, errors: [] as string[] }
    const device = await adapter.requestDevice()
    try {
      const path = '/src/ui/effects/hdr-glass.ts'
      const { HDR_SHADER } = (await import(path)) as typeof HdrModule
      const shader = device.createShaderModule({ code: HDR_SHADER })
      const info = await shader.getCompilationInfo()
      return {
        available: true,
        errors: info.messages
          .filter((message) => message.type === 'error')
          .map((message) => message.message),
      }
    } finally {
      device.destroy()
    }
  })
  test.skip(
    !result.available,
    'No WebGPU adapter in this browser; true HDR display validation is separate.',
  )
  expect(result.errors).toEqual([])
})

test('tiny wheel deltas scrub continuously, then snap once', async ({ page }) => {
  await page.goto('/')
  const flow = page.locator('.cover-flow')
  await flow.dispatchEvent('wheel', { deltaX: 12, deltaY: 0, deltaMode: 0 })
  await expect.poll(async () => Number(await flow.getAttribute('data-position'))).toBeGreaterThan(0)
  const during = Number(await flow.getAttribute('data-position'))
  expect(during).toBeLessThan(0.1)
  await expect(flow).toHaveAttribute('data-position', '0.00000')
  await expect(page.locator('.interaction-hint')).toHaveCount(0)
})

test('a keyboard interruption invalidates the pending wheel snap', async ({ page }) => {
  await page.goto('/')
  const flow = page.locator('.cover-flow')
  await flow.dispatchEvent('wheel', { deltaY: 260, deltaMode: 0 })
  await expect.poll(async () => Number(await flow.getAttribute('data-position'))).toBeGreaterThan(0)
  await page.keyboard.press('End')
  await expect(flow).toHaveAttribute('data-position', '8.00000')
  await page.waitForTimeout(250)
  await expect(flow).toHaveAttribute('data-position', '8.00000')
})

test('arrow navigation after a fractional gesture always settles on a whole card', async ({
  page,
}) => {
  await page.goto('/')
  const flow = page.locator('.cover-flow')
  await flow.dispatchEvent('wheel', { deltaY: 70, deltaMode: 0 })
  await expect.poll(async () => Number(await flow.getAttribute('data-position'))).toBeGreaterThan(0)
  await page.keyboard.press('ArrowRight')
  await expect(flow).toHaveAttribute('data-position', '1.00000')
})

test('drag follows the pointer; a held release has no stale fling and opens no tab', async ({
  page,
  context,
}) => {
  await page.goto('/')
  const flow = page.locator('.cover-flow')
  const card = page.locator('.cover-card[aria-current="true"]')
  const box = await card.boundingBox()
  if (!box) throw new Error('Missing cover')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  const distance = await card.evaluate((el) => (el as HTMLElement).offsetWidth * 0.85)
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x - distance * 0.8, y, { steps: 12 })
  await expect
    .poll(async () => Number(await flow.getAttribute('data-position')))
    .toBeCloseTo(0.8, 1)
  await page.waitForTimeout(120)
  await page.mouse.up()
  await expect(flow).toHaveAttribute('data-position', '1.00000')
  expect(context.pages()).toHaveLength(1)
})

test('pointer cancellation never activates a bookmark', async ({ page, context }) => {
  await page.goto('/')
  const card = page.locator('.cover-card[aria-current="true"]')
  await card.dispatchEvent('pointerdown', { pointerId: 31, button: 0, clientX: 600 })
  await card.dispatchEvent('pointercancel', { pointerId: 31 })
  await expect(page.locator('.cover-flow')).toHaveAttribute('data-position', '0.00000')
  expect(context.pages()).toHaveLength(1)
})

test('Infinity precision lens uses real SVG maps and settings arrows do not navigate covers', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'View options' }).click()
  await page.getByRole('radio', { name: 'Light', exact: true }).hover()
  const filter = page.locator('.liquid-filter-defs filter')
  await expect(filter).toHaveCount(1)
  expect(await filter.evaluate((el) => el.namespaceURI)).toBe('http://www.w3.org/2000/svg')
  await expect(filter.locator('feDisplacementMap')).toHaveCount(2)
  await expect(filter.locator('feDisplacementMap').first()).toHaveAttribute('scale', '24')
  await expect(filter.locator('feImage')).toHaveCount(3)
  await expect(page.locator('.liquid-toggle-thumb')).toHaveAttribute('data-liquid-profile', 'lip')
  await page.getByRole('radio', { name: 'Light', exact: true }).click()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('radio', { name: 'Dark', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(page.locator('.cover-flow')).toHaveAttribute('data-position', '0.00000')
})

test('preview updates preserve live cards and do not rebuild focused DOM', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const path = '/src/ui/components/cover-flow.ts'
    const { createCoverFlow } = (await import(path)) as { createCoverFlow: () => CoverFlowView }
    const flow = createCoverFlow()
    document.body.append(flow.element)
    const item = {
      bookmarkId: 'qa',
      title: 'Public fixture',
      subtitle: 'example.com',
      url: 'https://example.com',
      imageKind: 'generated' as const,
      fallbackKind: 'generated' as const,
      accent: '#72d5ff',
    }
    flow.setItems([item])
    flow.render(0)
    const original = flow.element.querySelector<HTMLButtonElement>('button')!
    original.focus()
    const image =
      'data:image/svg+xml,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="blue"/></svg>',
      )
    flow.setItems([{ ...item, imageKind: 'preview', image }])
    flow.render(0)
    const preview = flow.element.querySelector<HTMLImageElement>('img')!
    await new Promise<void>((resolve) => {
      if (preview.dataset.loaded === 'true') resolve()
      else preview.addEventListener('load', () => resolve(), { once: true })
    })
    await preview.decode()
    const result = {
      sameCard: original === flow.element.querySelector('button'),
      focusPreserved: document.activeElement === original,
      images: flow.element.querySelectorAll('img').length,
      previewOpacity: getComputedStyle(preview).opacity,
      previewBackground: getComputedStyle(preview).backgroundColor,
      fallbackVisibility: getComputedStyle(original.querySelector('.cover-card__fallback')!)
        .visibility,
    }
    flow.destroy()
    flow.element.remove()
    return result
  })
  expect(result).toEqual({
    sameCard: true,
    focusPreserved: true,
    images: 1,
    previewOpacity: '0.88',
    previewBackground: 'rgba(0, 0, 0, 0)',
    fallbackVisibility: 'hidden',
  })
})
