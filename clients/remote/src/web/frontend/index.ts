import { css, html, LitElement } from 'lit'
import { customElement, query, state } from 'lit/decorators.js'

import 'core-wallet-ui-components'
import 'core-wallet-ui-components/themes/default.css'
import { jsonRpcFetch } from './rpc-client'

@customElement('user-ui')
export class UserUI extends LitElement {
    @state()
    accessor party = undefined

    @state()
    accessor loading = false

    @query('#party-id-hint')
    accessor _input: HTMLInputElement | null = null

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

            <input
                ?disabled=${this.loading}
                id="party-id-hint"
                type="text"
                placeholder="Enter party ID hint"
            />
            <button ?disabled=${this.loading} @click=${this.allocateParty}>
                Allocate Party
            </button>
            ${this.party ? html`<p>Created party ID: ${this.party}</p>` : ''}
        </div>`
    }

    private async allocateParty() {
        this.loading = true

        const response = await jsonRpcFetch('http://localhost:3001/rpc', {
            method: 'allocateParty',
            params: {
                hint: this._input?.value || '',
            },
        })

        this.loading = false
        if (this._input) {
            this._input.value = ''
        }
        this.party = response.result.partyDetails.party
    }
}
