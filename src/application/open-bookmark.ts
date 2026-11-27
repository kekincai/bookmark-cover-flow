export interface OpenOptions {
  /** Open without switching to the new tab. */
  readonly background?: boolean
}

export interface TabService {
  open(url: string, options?: OpenOptions): Promise<void>
}

/** chrome:, file:, javascript: and similar bookmarks cannot be opened from an extension page. */
export class UnsupportedBookmarkError extends Error {
  constructor(readonly protocol: string) {
    super(`Unsupported bookmark protocol: ${protocol}`)
    this.name = 'UnsupportedBookmarkError'
  }
}

export async function openBookmark(
  service: TabService,
  url: string,
  options: OpenOptions = {},
): Promise<void> {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new UnsupportedBookmarkError('invalid')
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new UnsupportedBookmarkError(parsedUrl.protocol)
  }
  await service.open(parsedUrl.href, options)
}
