import { bootstrap } from './app/bootstrap'
import './ui/styles/index.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) throw new Error('Application root was not found.')

void bootstrap(root)
