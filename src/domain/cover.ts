export type CoverTemplate = 'mono' | 'type' | 'circle' | 'bands'

/** Album-style art generated when a site has no usable preview image. */
export interface CoverArt {
  readonly template: CoverTemplate
  readonly background: string
  readonly foreground: string
  readonly accent: string
  /** First character(s) for `mono`, list icons and the loading placeholder. */
  readonly glyph: string
  /** Two-line word mark for `type`. */
  readonly lines: readonly [string, string]
}

export interface CoverItem {
  readonly bookmarkId: string
  readonly title: string
  /** Hostname without `www.`. */
  readonly subtitle: string
  readonly url: string
  readonly folderTitle: string
  readonly dateAdded?: number
  readonly image?: string
  readonly favicon?: string
  /** `pending` while a preview may still arrive; generated art is shown underneath. */
  readonly imageKind: 'pending' | 'preview' | 'generated'
  readonly art: CoverArt
}

export interface CoverTransform {
  readonly x: number
  readonly z: number
  readonly rotateY: number
  readonly opacity: number
}
