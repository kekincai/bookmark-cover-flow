import { clamp } from '../shared/clamp'

export const selectBookmark = (index: number, itemCount: number): number =>
  itemCount === 0 ? 0 : Math.round(clamp(index, 0, itemCount - 1))
