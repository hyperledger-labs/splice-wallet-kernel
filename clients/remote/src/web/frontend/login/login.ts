import { html, LitElement } from 'lit'
import { customElement, state } from 'lit/decorators.js'

import 'core-wallet-ui-components'
import { userClient } from '../rpc-client'
import { Network } from 'core-wallet-user-rpc-client'
import { stateManager } from '../state-manager'

@customElement('user-ui-login')
export class LoginUI extends LitElement {
    @state()
    accessor idps: Network[] = []

    @state()
    accessor selectedNetwork: Network | null = null

    private handleChange(e: Event) {
        const index = parseInt((e.target as HTMLSelectElement).value)
        this.selectedNetwork = this.idps[index] ?? null
    }

    private async loadNetworks() {
        const response = await userClient.request('listNetworks')
        return response.networks
    }

    async connectedCallback() {
        super.connectedCallback()
        this.idps = await this.loadNetworks()
    }

    private async handleConnectToIDP() {
        if (!this.selectedNetwork) {
            alert('Please select a network before connecting')
            return
        }

        stateManager.chainId.set(this.selectedNetwork.chainId)

        const redirectUri = `${window.origin}/callback/`

        if (this.selectedNetwork.auth.type === 'implicit') {
            const auth = this.selectedNetwork.auth

            const config = await fetch(auth.configUrl).then((res) => res.json())
            const statePayload = {
                configUrl: auth.configUrl,
                clientId: auth.clientId,
                audience: auth.audience,
            }

            const params = new URLSearchParams({
                response_type: 'code',
                response_mode: 'fragment',
                client_id: this.selectedNetwork.auth.clientId || '',
                redirect_uri: redirectUri || '',
                nonce: crypto.randomUUID(),
                scope: auth.scope || '',
                audience: auth.audience || '',
                state: btoa(JSON.stringify(statePayload)),
            })

            window.location.href = `${config.authorization_endpoint}?${params.toString()}`
        } else {
            alert('Other auth type not implemented yet')
        }
    }

    protected render() {
        return html`
            <h1>User Login Page</h1>
            <select id="network" @change=${this.handleChange}>
                <option value="">--Network--</option>
                ${this.idps.map(
                    (net, index) =>
                        html`<option value=${index}>${net.name}</option>`
                )}
            </select>
            <button @click=${this.handleConnectToIDP}>Connect</button>
            <p>Selected network: ${this.selectedNetwork?.name}</p>
        `
    }
}
