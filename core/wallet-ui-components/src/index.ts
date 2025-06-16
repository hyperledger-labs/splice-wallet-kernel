import { discover } from './windows/discovery.js'

export * from './components/Discovery.js'
export * from './windows/discovery.js'

class AppUi extends HTMLElement {
    constructor() {
        super()
    }

    connectedCallback() {
        const shadow = this.attachShadow({ mode: 'open' })

        const button = document.createElement('button')
        button.innerHTML = 'Open Discover Popup'
        button.addEventListener('click', () => {
            discover()
        })

        shadow.appendChild(button)
    }
}

customElements.define('app-ui', AppUi)
