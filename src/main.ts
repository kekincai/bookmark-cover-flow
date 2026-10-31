import { bootstrap } from './app/bootstrap'
import './ui/styles/index.css'
import { initializeLocale } from './shared/i18n'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) throw new Error('Application root was not found.')

initializeLocale()
void bootstrap(root)
