import { LitElement, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import './LoginForm'
import './LoggedInView'
import { LedgerService } from '../ledger.service'
import * as sdk from '@splice/sdk-dapp'

@customElement('token-standard-example')
export class TokenStandardExample extends LitElement {
    @state() ledgerService: LedgerService | null = null
    @property() sessionToken: string | undefined = undefined
    @property() accounts: sdk.dappAPI.RequestAccountsResult = []

    get isLoggedIn(): boolean {
        return !!this.ledgerService
    }

    private async handleLoginSubmit(e: CustomEvent) {
        const { login } = e.detail
        if (!login || !this.sessionToken) {
            alert('Invalid login')
            return
        }
        try {
            const ledgerService = await LedgerService.create(
                login,
                this.sessionToken
            )
            this.ledgerService = ledgerService
        } catch (e) {
            console.log(e)
            alert("Couldn't connect to the ledger with user " + login)
        }
    }

    render() {
        return html`
            ${this.isLoggedIn
                ? html` <logged-in-view
                      .ledgerService=${this.ledgerService}
                  ></logged-in-view>`
                : html` <login-form
                      .accounts=${this.accounts}
                      @login-submit=${this.handleLoginSubmit}
                  ></login-form>`}
        `
    }
}
