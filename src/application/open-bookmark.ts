export interface TabService {
  open(url: string): Promise<void>
}

export async function openBookmark(service: TabService, url: string): Promise<void> {
  const parsedUrl = new URL(url)
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error(`Unsupported bookmark protocol: ${parsedUrl.protocol}`)
  }
  await service.open(parsedUrl.href)
}
