import { css, html, LitElement } from 'lit'
import { customElement } from 'lit/decorators.js'

import 'core-wallet-ui-components'

@customElement('user-ui')
export class UserUI extends LitElement {
    static styles = css`
        div {
            background-color: var(--splice-wk-background-color, none);
            color: var(--splice-wk-text-color, black);
            font-family: var(--splice-wk-font-family);
        }
    `

    protected render() {
        return html`<div>
            <h1>User UI</h1>
            <swk-configuration></swk-configuration>
        </div>`
    }
}
