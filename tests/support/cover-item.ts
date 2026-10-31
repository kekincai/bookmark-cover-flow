import { createCoverArt } from '../../src/application/cover-art'
import type { CoverItem } from '../../src/domain/cover'

export const coverItem = (
  overrides: Partial<CoverItem> & Pick<CoverItem, 'bookmarkId'>,
): CoverItem => {
  const title = overrides.title ?? 'Example'
  const subtitle = overrides.subtitle ?? 'example.com'
  return {
    title,
    subtitle,
    url: `https://${subtitle}/`,
    folderTitle: '',
    imageKind: 'generated',
    art: createCoverArt(title, subtitle),
    ...overrides,
  }
}
