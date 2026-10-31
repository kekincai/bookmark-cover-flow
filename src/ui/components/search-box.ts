import { t } from '../../shared/i18n'
import { icons } from './icons'

export interface SearchBoxView {
  readonly element: HTMLElement
  readonly input: HTMLInputElement
  clear(): void
  onSearch(listener: (query: string) => void): void
}

export function createSearchBox(): SearchBoxView {
  const element = document.createElement('div')
  element.className = 'search-box'
  element.innerHTML = icons.search
  const input = document.createElement('input')
  input.type = 'search'
  input.className = 'search-box__input'
  input.placeholder = t('searchBookmarks')
  input.autocomplete = 'off'
  input.spellcheck = false
  input.setAttribute('aria-label', t('searchBookmarks'))
  const clearButton = document.createElement('button')
  clearButton.type = 'button'
  clearButton.className = 'search-box__clear'
  clearButton.setAttribute('aria-label', t('clearSearch'))
  clearButton.innerHTML = icons.clear
  clearButton.hidden = true
  element.append(input, clearButton)

  let search: (query: string) => void = () => undefined
  const sync = (): void => {
    clearButton.hidden = input.value === ''
    search(input.value)
  }
  const clear = (): void => {
    if (input.value === '') return
    input.value = ''
    sync()
  }
  input.addEventListener('input', sync)
  clearButton.addEventListener('click', () => {
    clear()
    input.focus()
  })

  return {
    element,
    input,
    clear,
    onSearch(listener): void {
      search = listener
    },
  }
}
