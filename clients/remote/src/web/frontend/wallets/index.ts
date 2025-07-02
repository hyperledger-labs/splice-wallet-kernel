import { css, html, LitElement } from 'lit'
import { customElement, query, state } from 'lit/decorators.js'

import 'core-wallet-ui-components'
import 'core-wallet-ui-components/themes/default.css'
import { jsonRpcFetch } from '../rpc-client'
import { config } from '../config'
import { Wallet } from 'core-wallet-store'
import { CreateWalletParams } from '../../../user-api/rpc-gen/typings'

@customElement('user-ui-wallets')
export class UserUiWallets extends LitElement {
    @state()
    accessor signingProviders: string[] = ['participant']

    @state()
    accessor selectedSigningProvider: string = 'participant'

    @state()
    accessor wallets: Wallet[] = []

    @state()
    accessor createdParty = undefined

    @state()
    accessor loading = false

    @query('#party-id-hint')
    accessor _partyHintInput: HTMLInputElement | null = null

    @query('#signing-provider-id')
    accessor _signingProviderSelect: HTMLSelectElement | null = null

    @query('#primary')
    accessor _primaryCheckbox: HTMLInputElement | null = null

    static styles = css`
        div {
            background-color: var(--splice-wk-background-color, none);
            color: var(--splice-wk-text-color, black);
            font-family: var(--splice-wk-font-family);
        }

        #create-wallet-form {
            max-width: 300px;
            display: flex;
            flex-direction: column;

            label {
                margin-bottom: 0.5rem;
            }

            .form-control {
                margin-bottom: 1.5rem;
                padding: 0.5rem;
                border: 1px solid var(--splice-wk-border-color, #ccc);
                border-radius: 4px;

                &.inline {
                    padding: 0;
                    border: none;
                }
            }
        }
    `

    protected render() {
        return html`<div>
            <h1>Wallets UI</h1>

            <h2>Create a Wallet</h2>

            <form id="create-wallet-form">
                <label for="party-id-hint">Party ID hint:</label>
                <input
                    ?disabled=${this.loading}
                    class="form-control"
                    id="party-id-hint"
                    type="text"
                    placeholder="Enter party ID hint"
                />

                <label for="signing-provider-id">Signing Provider:</label>
                <select class="form-control" id="signing-provider-id">
                    <option disabled value="">
                        Signing provider for wallet
                    </option>
                    ${this.signingProviders.map(
                        (providerId, index) =>
                            html`<option value=${index}>${providerId}</option>`
                    )}
                </select>

                <div class="form-control inline">
                    <label for="primary">Set as primary wallet:</label>
                    <input id="primary" type="checkbox" />
                </div>
            </form>

            ${this.createdParty
                ? html`<p>Created party ID: ${this.createdParty}</p>`
                : ''}
            <button ?disabled=${this.loading} @click=${this.createWallet}>
                Create
            </button>

            <h2>Existing Wallets</h2>
            <ul>
                ${this.wallets.map(
                    (wallet) =>
                        html`<li>
                            <strong>${wallet.hint || wallet.partyId}</strong>
                            <span style="font-style: italic;"
                                >${wallet.primary ? '(Primary)' : ''}</span
                            >
                        </li>`
                )}
            </ul>
        </div>`
    }

    connectedCallback(): void {
        super.connectedCallback()

        jsonRpcFetch(config.userRpcUri, {
            method: 'listWallets',
        }).then((wallets) => {
            this.wallets = wallets.result || []
        })
    }

    private async createWallet() {
        this.loading = true

        const partyHint = this._partyHintInput?.value || ''
        const primary = this._primaryCheckbox?.checked || false
        const signingProviderId = this.selectedSigningProvider
        const networkId = 'placeholder-network-id'

        const body: CreateWalletParams = {
            primary,
            partyHint,
            networkId,
            signingProviderId,
        }

        const response = await jsonRpcFetch(config.userRpcUri, {
            method: 'createWallet',
            params: body,
        })

        this.loading = false
        if (this._partyHintInput) {
            this._partyHintInput.value = ''
        }
        this.wallets.push(response.result.wallet)
    }
}
