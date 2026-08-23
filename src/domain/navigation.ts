export type NavigationCommand =
  | { readonly type: 'next' }
  | { readonly type: 'previous' }
  | { readonly type: 'move'; readonly delta: number }
  | { readonly type: 'open' }
  | { readonly type: 'search'; readonly query: string }
  | { readonly type: 'first' }
  | { readonly type: 'last' }

export interface MotionState {
  readonly position: number
  readonly targetPosition: number
  readonly velocity: number
  readonly lastTimestamp: number
}
