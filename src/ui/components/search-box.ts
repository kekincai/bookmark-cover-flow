import { t } from '../../shared/i18n'

export interface SearchBoxView {
  readonly element: HTMLElement
  readonly input: HTMLInputElement
  onSearch(listener: (query: string) => void): void
}

export function createSearchBox(): SearchBoxView {
  const element = document.createElement('label')
  element.className = 'search-box'
  element.innerHTML = `
    <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="m16.2 16.2 4 4"></path></svg>
  `
  const input = document.createElement('input')
  input.type = 'search'
  input.placeholder = t('searchBookmarks')
  input.autocomplete = 'off'
  input.setAttribute('aria-label', t('searchBookmarks'))
  element.append(input)

  let search: (query: string) => void = () => undefined
  input.addEventListener('input', () => search(input.value))

  return {
    element,
    input,
    onSearch(listener): void {
      search = listener
    },
  }
}
