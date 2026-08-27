import { bootstrap } from './app/bootstrap'
import './ui/styles/index.css'
import { LiquidGlassSystem } from './ui/effects/liquid-glass'
import { LiquidRange, LiquidToggle } from './ui/effects/liquid-controls'
import { initializeLocale } from './shared/i18n'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) throw new Error('Application root was not found.')

customElements.define('liquid-toggle', LiquidToggle)
customElements.define('liquid-range', LiquidRange)
initializeLocale()
void bootstrap(root)
customElements.define('liquid-glass-system', LiquidGlassSystem)
document.body.classList.add('hdr-highlights')
document.body.append(document.createElement('liquid-glass-system'))
