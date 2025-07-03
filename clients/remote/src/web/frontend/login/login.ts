import { css, html, LitElement } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { NetworkConfig } from 'core-wallet-store'
import 'core-wallet-ui-components'
import 'core-wallet-ui-components/themes/default.css'
import { userClient } from '../rpc-client'

@customElement('user-ui-login')
export class LoginUI extends LitElement {
    static styles = css`
        div {
            background-color: var(--splice-wk-background-color, none);
            color: var(--splice-wk-text-color, black);
            font-family: var(--splice-wk-font-family);
        }
    `

    @state()
    accessor idps: NetworkConfig[] = []

    @state()
    accessor selectedNetwork: NetworkConfig | null = null

    private handleChange(e: Event) {
        const index = parseInt((e.target as HTMLSelectElement).value)
        this.selectedNetwork = this.idps[index] ?? null
    }

    private async loadNetworks() {
        const response = await userClient.request('listNetworks')
        return response.networks as NetworkConfig[]
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

        const redirectUri = 'http://localhost:3002/callback/' //should probably be config driven?
        if (this.selectedNetwork.auth.type === 'implicit') {
            const domain = this.selectedNetwork.auth.domain

            const configUrl = `${domain}/.well-known/openid-configuration`
            const config = await fetch(configUrl).then((res) => res.json())
            const scope = this.selectedNetwork.auth.scope
            const audience = this.selectedNetwork.auth.audience
            const statePayload = {
                domain: domain,
                clientId: this.selectedNetwork.auth.clientId,
            }

            const params = new URLSearchParams({
                response_type: 'code',
                response_mode: 'fragment',
                client_id: this.selectedNetwork.auth.clientId,
                redirect_uri: redirectUri,
                nonce: crypto.randomUUID(),
                scope,
                audience,
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
