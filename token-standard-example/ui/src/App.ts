import { LitElement, html, nothing } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import './components/WalletKernelConnector'
import './components/TokenStandardExample'
import * as sdk from '@splice/sdk-dapp'

@customElement('exercise-app')
export class ExerciseApp extends LitElement {
    @state() sessionToken: string | undefined = undefined
    @state() accounts: sdk.dappAPI.RequestAccountsResult = []

    private onConnected(e: CustomEvent<{ sessionToken: string }>) {
        this.sessionToken = e.detail.sessionToken
    }
    private onAccountsChanged(
        e: CustomEvent<{ accounts: sdk.dappAPI.RequestAccountsResult }>
    ) {
        this.accounts = e.detail.accounts
    }

    render() {
        return html`
            <wallet-kernel-connector
                @connected=${this.onConnected}
                @accountsChanged=${this.onAccountsChanged}
            ></wallet-kernel-connector>
            ${this.sessionToken
                ? html` <token-standard-example
                      .sessionToken=${this.sessionToken}
                      .accounts=${this.accounts}
                  ></token-standard-example>`
                : nothing}
        `
    }
}
