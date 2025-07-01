import { WalletEvent } from 'core-types'
import { LitElement, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'

@customElement('login-callback')
export class LoginCallback extends LitElement {
    @state()
    accessor accessToken = ''

    connectedCallback(): void {
        super.connectedCallback()
        this.handleRedirect()
    }

    async handleRedirect() {
        console.log('entered handle redirect')
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')

        if (!code && !state) {
            console.error('missing state and code')
            return
        }

        if (code && state) {
            const fetchConfig = await fetch(
                `${state}/.well-known/openid-configuration`
            )
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
                    client_id: 'my-client',
                }),
            })

            const tokenResponse = await res.json()

            if (tokenResponse.access_token) {
                this.accessToken = tokenResponse.access_token
                localStorage.setItem('access_token', this.accessToken)

                if (window.opener && !window.opener.closed) {
                    window.opener.postMessage(
                        {
                            type: WalletEvent.SPLICE_WALLET_IDP_AUTH_SUCCESS,
                            token: this.accessToken,
                        },
                        '*'
                    )
                }

                window.location.replace('/')
            }
        }
    }

    render() {
        return html` <h2>Logged in!</h2> `
    }
}
