import { html, LitElement } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('swk-configuration')
export class Configuration extends LitElement {
    protected render() {
        return html`
            <div>
                <h1>Configuration</h1>
                <p>Wallet Kernel configuration page.</p>
            </div>
        `
    }
}
