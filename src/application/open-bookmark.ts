export interface OpenOptions {
  /** Open without switching to the new tab. */
  readonly background?: boolean
}

export interface TabService {
  open(url: string, options?: OpenOptions): Promise<void>
}

export async function openBookmark(
  service: TabService,
  url: string,
  options: OpenOptions = {},
): Promise<void> {
  const parsedUrl = new URL(url)
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error(`Unsupported bookmark protocol: ${parsedUrl.protocol}`)
  }
  await service.open(parsedUrl.href, options)
}
