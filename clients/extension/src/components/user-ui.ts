import { html, LitElement } from 'lit'
import { customElement } from 'lit/decorators.js'

import '@canton-network/core-wallet-ui-components'

@customElement('user-ui')
export class UserUI extends LitElement {
    protected render() {
        return html`<div>
            <h1>User UI</h1>
            <swk-configuration></swk-configuration>
        </div>`
    }
}
