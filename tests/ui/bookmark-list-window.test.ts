import { describe, expect, it } from 'vitest'
import { getListWindow } from '../../src/ui/components/bookmark-list'

describe('bookmark list windowing', () => {
  it('renders only the viewport plus overscan for a 5,000 item collection', () => {
    // 10 rows visible from row 2,000; 8 rows of overscan on each side.
    const range = getListWindow(2_000 * 28, 280, 28, 5_000, 8)
    expect(range).toEqual({ first: 1992, last: 2017 })
    expect(range.last - range.first + 1).toBeLessThanOrEqual(26)
  })

  it('includes partially visible rows', () => {
    expect(getListWindow(14, 28, 28, 100, 0)).toEqual({ first: 0, last: 1 })
  })

  it('clamps at the start and end of the collection', () => {
    expect(getListWindow(0, 280, 28, 5_000)).toEqual({ first: 0, last: 17 })
    expect(getListWindow(-40, 280, 28, 5_000)).toEqual({ first: 0, last: 17 })
    expect(getListWindow(4_990 * 28, 280, 28, 5_000)).toEqual({ first: 4982, last: 4999 })
    expect(getListWindow(1e9, 280, 28, 5_000)).toEqual({ first: 4999, last: 4999 })
  })

  it('handles short and empty collections', () => {
    expect(getListWindow(0, 600, 28, 3)).toEqual({ first: 0, last: 2 })
    expect(getListWindow(0, 600, 28, 0)).toEqual({ first: 0, last: -1 })
    expect(getListWindow(0, 0, 28, 50, 8)).toEqual({ first: 0, last: 7 })
  })
})
