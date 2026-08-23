import type { BookmarkFolder } from '../../domain/bookmark'
import type { CoverItem } from '../../domain/cover'

export interface AppState {
  readonly folders: readonly BookmarkFolder[]
  readonly activeFolderId?: string
  readonly covers: readonly CoverItem[]
  readonly visibleCovers: readonly CoverItem[]
  readonly selectedIndex: number
  readonly query: string
  readonly isSearching: boolean
  readonly status: 'loading' | 'ready' | 'empty' | 'error'
  readonly errorMessage?: string
}

export interface Store<T> {
  readonly value: T
  update(updater: (state: T) => T): void
  subscribe(listener: (state: T) => void): () => void
}

export function createStore<T>(initialValue: T): Store<T> {
  let currentValue = initialValue
  const listeners = new Set<(state: T) => void>()

  return {
    get value(): T {
      return currentValue
    },
    update(updater): void {
      const nextValue = updater(currentValue)
      if (Object.is(currentValue, nextValue)) return
      currentValue = nextValue
      listeners.forEach((listener) => listener(currentValue))
    },
    subscribe(listener): () => void {
      listeners.add(listener)
      listener(currentValue)
      return () => listeners.delete(listener)
    },
  }
}
