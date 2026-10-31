import { expect, test } from '@playwright/test'
import type * as CoverArtModule from '../src/application/cover-art'
import type { CoverItem } from '../src/domain/cover'
import type * as CoverFlowModule from '../src/ui/components/cover-flow'
import { DEMO_TOTAL, coverFlow, openApp, position } from './helpers'

test('tiny wheel deltas scrub continuously, then snap once', async ({ page }) => {
  await openApp(page)
  const flow = coverFlow(page)
  // 60 px of travel per 240 px cover: 6 px is a tenth of a cover.
  await flow.dispatchEvent('wheel', { deltaX: 6, deltaY: 0, deltaMode: 0 })
  await expect.poll(() => position(page)).toBeGreaterThan(0)
  const during = await position(page)
  expect(during).toBeLessThan(0.2)
  await expect(flow).toHaveAttribute('data-position', '0.00000')
})

test('wheel travel past half a cover snaps to the next one', async ({ page }) => {
  await openApp(page)
  const flow = coverFlow(page)
  await flow.dispatchEvent('wheel', { deltaY: 40, deltaMode: 0 })
  await expect(flow).toHaveAttribute('data-position', '1.00000')
})

test('a keyboard interruption invalidates the pending wheel snap', async ({ page }) => {
  await openApp(page)
  const flow = coverFlow(page)
  await flow.dispatchEvent('wheel', { deltaY: 260, deltaMode: 0 })
  await expect.poll(() => position(page)).toBeGreaterThan(0)
  await page.keyboard.press('End')
  await expect(flow).toHaveAttribute('data-position', `${DEMO_TOTAL - 1}.00000`)
  await page.waitForTimeout(250)
  await expect(flow).toHaveAttribute('data-position', `${DEMO_TOTAL - 1}.00000`)
})

test('arrow navigation after a fractional gesture always settles on a whole card', async ({
  page,
}) => {
  await openApp(page)
  const flow = coverFlow(page)
  await flow.dispatchEvent('wheel', { deltaY: 20, deltaMode: 0 })
  await expect.poll(() => position(page)).toBeGreaterThan(0)
  await page.keyboard.press('ArrowRight')
  await expect(flow).toHaveAttribute('data-position', '1.00000')
})

test('drag follows the pointer; a held release has no stale fling and opens no tab', async ({
  page,
  context,
}) => {
  await openApp(page)
  const flow = coverFlow(page)
  const card = page.locator('.stage .cover-card[aria-current="true"]')
  const box = await card.boundingBox()
  if (!box) throw new Error('Missing cover')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  // One cover per 60 px at 240 px, scaled by the actual cover width.
  const perCover = await card.evaluate(
    (element) => (60 * (element as HTMLElement).offsetWidth) / 240,
  )
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x - perCover * 0.8, y, { steps: 12 })
  await expect.poll(() => position(page)).toBeCloseTo(0.8, 1)
  await expect(flow).toHaveAttribute('data-dragging', 'true')
  await page.waitForTimeout(120)
  await page.mouse.up()
  await expect(flow).toHaveAttribute('data-position', '1.00000')
  await page.waitForTimeout(250)
  await expect(flow).toHaveAttribute('data-position', '1.00000')
  expect(context.pages()).toHaveLength(1)

  // A longer drag moves several covers.
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x - perCover * 3, y, { steps: 20 })
  await page.waitForTimeout(120)
  await page.mouse.up()
  await expect(flow).toHaveAttribute('data-position', '4.00000')
  expect(context.pages()).toHaveLength(1)
})

test('pointer cancellation never activates a bookmark', async ({ page, context }) => {
  await openApp(page)
  const card = page.locator('.stage .cover-card[aria-current="true"]')
  await card.dispatchEvent('pointerdown', { pointerId: 31, button: 0, clientX: 600 })
  await card.dispatchEvent('pointercancel', { pointerId: 31 })
  await card.dispatchEvent('click')
  await expect(coverFlow(page)).toHaveAttribute('data-position', '0.00000')
  await page.waitForTimeout(200)
  expect(context.pages()).toHaveLength(1)
  await expect(card.locator('.cover-card__hint-label')).toHaveText('Open')
})

test('the scrubber drives the target position', async ({ page }) => {
  await openApp(page)
  await page.locator('.stage .scrubber__range').fill('6')
  await expect(coverFlow(page)).toHaveAttribute('data-position', '6.00000')
})

test('preview updates preserve live cards and do not rebuild focused DOM', async ({ page }) => {
  await openApp(page)
  const result = await page.evaluate(async () => {
    const flowPath = '/src/ui/components/cover-flow.ts'
    const artPath = '/src/application/cover-art.ts'
    const { createCoverFlow } = (await import(flowPath)) as typeof CoverFlowModule
    const { createCoverArt } = (await import(artPath)) as typeof CoverArtModule
    const flow = createCoverFlow()
    document.body.append(flow.element)
    const item: CoverItem = {
      bookmarkId: 'qa',
      title: 'Public fixture',
      subtitle: 'example.com',
      url: 'https://example.com',
      folderTitle: 'QA',
      imageKind: 'pending',
      art: createCoverArt('Public fixture', 'example.com'),
    }
    flow.setItems([item])
    flow.render(0)
    const original = flow.element.querySelector<HTMLButtonElement>('.cover-card')!
    const artBefore = original.querySelector('.cover-art')!.innerHTML
    original.focus()
    const pendingPlaceholder = getComputedStyle(
      original.querySelector('.cover-card__placeholder')!,
    ).opacity
    const image =
      'data:image/svg+xml,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="blue"/></svg>',
      )
    flow.setItems([{ ...item, imageKind: 'preview', image }])
    flow.render(0)
    const preview = flow.element.querySelector<HTMLImageElement>('.cover-card__preview')!
    await new Promise<void>((resolve) => {
      if (preview.dataset.loaded === 'true') resolve()
      else preview.addEventListener('load', () => resolve(), { once: true })
    })
    await preview.decode()
    await new Promise((resolve) => setTimeout(resolve, 260))
    const output = {
      sameCard: original === flow.element.querySelector('.cover-card'),
      focusPreserved: document.activeElement === original,
      images: flow.element.querySelectorAll('img').length,
      state: original.dataset.state,
      previewOpacity: getComputedStyle(preview).opacity,
      pendingPlaceholder,
      placeholderOpacity: getComputedStyle(original.querySelector('.cover-card__placeholder')!)
        .opacity,
      artPreserved: original.querySelector('.cover-art')!.innerHTML === artBefore,
      label: original.getAttribute('aria-label'),
    }
    // A preview that turns out missing falls back to the generated art in the same card.
    flow.setItems([{ ...item, imageKind: 'generated' }])
    flow.render(0)
    const fallback = {
      sameCard: original === flow.element.querySelector('.cover-card'),
      images: flow.element.querySelectorAll('img').length,
    }
    flow.destroy()
    flow.element.remove()
    return { ...output, fallback }
  })
  expect(result).toEqual({
    sameCard: true,
    focusPreserved: true,
    images: 1,
    state: 'preview',
    previewOpacity: '1',
    pendingPlaceholder: '1',
    placeholderOpacity: '0',
    artPreserved: true,
    label: 'Public fixture, example.com',
    fallback: { sameCard: true, images: 0 },
  })
})

test('cards recycled by a long scrub keep their own index, label and click target', async ({
  page,
}) => {
  await openApp(page)
  const range = page.locator('.stage .scrubber__range')
  for (const index of ['18', '0', '10']) {
    await range.fill(index)
    await expect(coverFlow(page)).toHaveAttribute('data-position', `${index}.00000`)
  }
  const cards = await page.locator('.stage .cover-card').evaluateAll((elements) =>
    elements.map((element) => ({
      index: Number((element as HTMLElement).dataset.index),
      posinset: Number(element.getAttribute('aria-posinset')),
      label: element.getAttribute('aria-label'),
    })),
  )
  const titles = await page
    .locator('.bookmark-list__row[data-index]')
    .evaluateAll((rows): Record<string, string> =>
      Object.fromEntries(
        rows.map((row): [string, string] => [
          (row as HTMLElement).dataset.index ?? '',
          `${row.querySelector('.bookmark-list__title')?.textContent}, ${row.querySelector('.bookmark-list__cell--site')?.textContent}`,
        ]),
      ),
    )
  expect(cards.map((card) => card.index).sort((a, b) => a - b)).toEqual(
    Array.from({ length: 15 }, (_, offset) => offset + 3),
  )
  for (const card of cards) {
    expect(card.posinset).toBe(card.index + 1)
    expect(card.label).toBe(titles[String(card.index)])
  }
  const neighbour = page.locator('.stage .cover-card[data-index="11"]')
  const point = await neighbour.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    for (let x = bounds.left + 2; x < bounds.right; x += 4)
      for (let y = bounds.top + 4; y < bounds.bottom; y += 8)
        if (document.elementFromPoint(x, y)?.closest('.cover-card') === element) return { x, y }
    return null
  })
  if (point === null) throw new Error('Cover 11 has no clickable area.')
  await page.mouse.click(point.x, point.y)
  await expect(coverFlow(page)).toHaveAttribute('data-position', '11.00000')
})
