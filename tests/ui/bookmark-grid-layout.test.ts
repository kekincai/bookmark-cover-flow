import { describe, expect, it } from 'vitest'
import { getGridLayout, getGridWindow } from '../../src/ui/components/bookmark-grid'

describe('grid layout', () => {
  it('fits as many 168 px covers as possible and stretches them to fill the row', () => {
    const layout = getGridLayout(1192)
    expect(layout.columns).toBe(6)
    expect(layout.cellWidth).toBeGreaterThanOrEqual(168)
    expect(
      28 * 2 + layout.columns * layout.cellWidth + 24 * (layout.columns - 1),
    ).toBeLessThanOrEqual(1192)
  })

  it('keeps one column in very narrow windows', () => {
    expect(getGridLayout(120).columns).toBe(1)
  })
})

describe('grid window', () => {
  const layout = { columns: 6, cellWidth: 170, rowHeight: 242 }

  it('renders only the visible rows plus a small overscan for large collections', () => {
    const range = getGridWindow(242 * 400, 700, layout, 5_000)
    // About three visible rows plus two rows of overscan on each side.
    expect(range.last - range.first + 1).toBeLessThanOrEqual(6 * 9)
    expect(range.first % 6).toBe(0)
  })

  it('clamps to the collection and handles empty collections', () => {
    expect(getGridWindow(0, 700, layout, 4)).toEqual({ first: 0, last: 3 })
    expect(getGridWindow(0, 700, layout, 0)).toEqual({ first: 0, last: -1 })
  })
})
