import { css, html, LitElement } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('swk-configuration')
export class Configuration extends LitElement {
    static styles = css`
        div {
            background-color: var(--splice-wk-background-color, none);
            color: var(--splice-wk-text-color, black);
            font-family: var(--splice-wk-font-family);
        }
    `

    protected render() {
        return html`
            <div>
                <h1>Configuration</h1>
                <p>Wallet Kernel configuration page.</p>
            </div>
        `
    }
}
