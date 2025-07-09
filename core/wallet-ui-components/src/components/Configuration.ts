import { html, LitElement } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('swk-configuration')
export class Configuration extends LitElement {
    // Prevent shadow DOM so external CSS applies
    createRenderRoot() {
        return this
    }

    protected render() {
        return html`
            <div>
                <h1>Configuration</h1>
                <p>Wallet Kernel configuration page.</p>
            </div>
        `
    }
}
