export type NavigationCommand =
  | { readonly type: 'next' }
  | { readonly type: 'previous' }
  | { readonly type: 'move'; readonly delta: number }
  | { readonly type: 'open'; readonly background?: boolean }
  | { readonly type: 'search'; readonly query: string }
  | { readonly type: 'first' }
  | { readonly type: 'last' }
  | { readonly type: 'page-previous' }
  | { readonly type: 'page-next' }
  | { readonly type: 'toggle-fullscreen' }
  | { readonly type: 'escape' }

export interface MotionState {
  readonly position: number
  readonly targetPosition: number
  readonly velocity: number
  readonly lastTimestamp: number
}
