import { WalletEvent } from 'core-types'
import { LitElement, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'

@customElement('login-callback')
export class LoginCallback extends LitElement {
    @state()
    accessor accessToken = ''

    @state()
    accessor idToken = ''

    connectedCallback(): void {
        super.connectedCallback()
        this.handleRedirect()
    }

    handleRedirect() {
        const hash = window.location.hash.substring(1)
        const params = new URLSearchParams(hash)

        const accessToken = params.get('access_token')
        const idToken = params.get('id_token')

        if (!accessToken || !idToken) {
            console.error('Missing tokens in URL fragment')
            return
        }

        this.accessToken = accessToken
        this.idToken = idToken

        localStorage.setItem('access_token', accessToken)
        localStorage.setItem('id_token', idToken)

        if (window.opener && !window.opener.closed) {
            window.opener.postMessage(
                {
                    type: WalletEvent.SPLICE_WALLET_IDP_AUTH_SUCCESS,
                    token: accessToken,
                },
                '*'
            )
        }

        window.location.replace('/')
    }

    render() {
        return html` <h2>Logged in!</h2> `
    }
}
