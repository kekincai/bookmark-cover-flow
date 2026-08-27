export interface CoverItem {
  readonly bookmarkId: string
  readonly title: string
  readonly subtitle: string
  readonly url: string
  readonly image?: string
  readonly favicon?: string
  readonly imageKind: 'preview' | 'favicon' | 'generated'
  readonly fallbackKind: 'favicon' | 'generated'
  readonly accent: string
}

export interface CoverTransform {
  readonly x: number
  readonly z: number
  readonly rotateY: number
  readonly scale: number
  readonly opacity: number
}
