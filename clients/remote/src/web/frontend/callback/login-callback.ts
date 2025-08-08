import { WindowTransport } from 'core-types'
import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'
import { userClient } from '../rpc-client'
import { stateManager } from '../state-manager'

@customElement('login-callback')
export class LoginCallback extends LitElement {
    connectedCallback(): void {
        super.connectedCallback()
        this.handleRedirect()
    }

    async handleRedirect() {
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')
        const encodedState = url.searchParams.get('state')

        if (!code && !encodedState) {
            console.error('missing state and code')
            return
        }

        if (code && encodedState) {
            const state = JSON.parse(atob(encodedState))
            const fetchConfig = await fetch(state.configUrl)
            const config = await fetchConfig.json()
            const tokenEndpoint = config.token_endpoint

            const res = await fetch(tokenEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: 'http://localhost:3002/callback/',
                    client_id: state.clientId,
                    audience: state.audience,
                }),
            })

            const tokenResponse = await res.json()

            if (tokenResponse.access_token) {
                stateManager.accessToken.set(tokenResponse.access_token)

                const session = await userClient.transport.submit({
                    method: 'addSession',
                    params: {
                        chainId: stateManager.chainId.get(),
                    },
                })

                new WindowTransport(window.opener).submitUserResponse(
                    null,
                    session
                )

                window.location.replace('/')
            }
        }
    }

    render() {
        return html`<h2>Logged in!</h2>`
    }
}
