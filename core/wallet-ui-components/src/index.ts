import { css, html, LitElement } from 'lit'
import { discover } from './windows/discovery.js'
import { customElement } from 'lit/decorators.js'

export * from './components/AppHeader.js'
export * from './components/AppLayout.js'
export * from './components/Discovery.js'
export * from './windows/discovery.js'
export * from './windows/popup.js'

import './components/Discovery.js'
import './components/Configuration.js'
import { html as htmlStatic, literal } from 'lit/static-html.js'

@customElement('app-ui')
export class AppUi extends LitElement {
    static styles = css`
        .component {
            padding: 8px;
            border: 1px solid #ccc;
            background-color: #f9f9f9;
        }
    `

    // add new components here to be displayed on the dev page
    components = [
        {
            name: 'Discovery.ts',
            element: literal`swk-discovery`,
        },
        {
            name: 'Configuration.ts',
            element: literal`swk-configuration`,
        },
    ]

    private addWalletExtensionLoaded() {
        const { shadowRoot } = document.getElementsByTagName('app-ui')[0]
        const discovery = shadowRoot?.querySelector('swk-discovery')

        if (discovery) {
            const existing = discovery.hasAttribute('wallet-extension-loaded')

            if (existing) {
                discovery.removeAttribute('wallet-extension-loaded')
            } else {
                discovery.setAttribute('wallet-extension-loaded', '')
            }
        } else {
            console.error('Discovery component not found.')
        }
    }

    protected render() {
        return html`
            <div>
                <h1>Wallet UI Components Dev Page</h1>
                <p>Click the button below to open the discovery popup.</p>
                <button @click=${discover}>Open Discover Popup</button>

                <h2>Components</h2>

                ${this.components.map(({ name, element }) => {
                    return htmlStatic`
                        <h3>${name}</h3>
                        <div class="component">
                            <${element}></${element}>
                        </div>
                        <hr/>
                    `
                })}

                <h2>Helpers</h2>

                <button @click=${this.addWalletExtensionLoaded}>
                    Toggle attribute 'wallet-extension-loaded' to discovery
                </button>
            </div>
        `
    }
}
