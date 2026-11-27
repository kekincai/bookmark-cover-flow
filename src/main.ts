import { bootstrap } from './app/bootstrap'
import './ui/styles/index.css'
import { initializeLocale, t } from './shared/i18n'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) throw new Error('Application root was not found.')

initializeLocale()

try {
  await bootstrap(root)
} catch (error: unknown) {
  // A failure before the first render would otherwise leave a blank page.
  console.error('Bookmark Shelf failed to start.', error)
  const message = document.createElement('p')
  message.setAttribute('role', 'alert')
  message.className = 'fatal-error'
  message.textContent = t('bookmarksFailed')
  root.replaceChildren(message)
}
