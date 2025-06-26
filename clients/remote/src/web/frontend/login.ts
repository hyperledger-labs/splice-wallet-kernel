import { css, html, LitElement } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import * as store from 'core-wallet-store'
import 'core-wallet-ui-components'
import 'core-wallet-ui-components/themes/default.css'

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
    accessor test: store.NetworkConfig[] = [
        {
            name: 'xyz',
            description: 'name1',
            ledgerApi: {
                baseUrl: 'https://test',
            },
            auth: {
                type: 'password',
                tokenUrl: 'tokenUrl',
                grantType: 'password',
                scope: 'openid',
                clientId: 'wk-service-account',
            },
        },
        {
            name: 'abc',
            description: 'dex idp',
            ledgerApi: {
                baseUrl: 'https://test',
            },
            auth: {
                type: 'implicit',
                domain: 'dex.com',
                audience: 'https://daml.com/jwt/aud/participant/wk-app',
                scope: 'openid',
                clientId: 'wk-service-account2',
            },
        },
        {
            name: 'abc2',
            description: 'oauth',
            ledgerApi: {
                baseUrl: 'https://test',
            },
            auth: {
                type: 'implicit',
                domain: 'canton-registry-app-dev-1.eu.auth0.com/',
                audience: 'https://daml.com/jwt/aud/participant/wk-app',
                scope: 'openid',
                clientId: 'wk-service-account2',
            },
        },
    ]

    @state()
    accessor selectedNetwork: store.NetworkConfig | null = null

    private handleChange(e: Event) {
        const index = parseInt((e.target as HTMLSelectElement).value)
        this.selectedNetwork = this.test[index] ?? null
    }

    private async handleConnectToIDP() {
        console.log('oauth flow implement here!')

        if (!this.selectedNetwork) {
            alert('Please select a network before connecting')
            return
        }

        const redirectUri = 'http://localhost:3002/callback' //should probably be config driven?
        if (this.selectedNetwork.auth.type === 'implicit') {
            const domain = this.selectedNetwork.auth.domain
            const configUrl = `https://${domain}/.well-known/openid-configuration`
            const config = await fetch(configUrl).then((res) => res.json())
            const scope = this.selectedNetwork.auth.scope
            const audience = this.selectedNetwork.auth.audience
            const params = new URLSearchParams({
                response_type: 'token',
                client_id: this.selectedNetwork.auth.clientId,
                redirect_uri: redirectUri,
                scope,
                audience,
                state: domain,
            })

            window.location.href = `${config.authorization_endpoint}?${params.toString}`
        } else {
            alert('Other auth type not implemented yet')
        }
    }

    protected render() {
        return html`
            <h1>User Login Page</h1>
            <select id="network" @change=${this.handleChange}>
                <option value="">--Network--</option>
                ${this.test.map(
                    (net, index) =>
                        html`<option value=${index}>${net.name}</option>`
                )}
            </select>
            <button @click=${this.handleConnectToIDP}>Connect</button>
            <p>Selected network: ${this.selectedNetwork?.name}</p>
        `
    }
}
