// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import { css, html, LitElement } from 'lit'
import { customElement, query, state } from 'lit/decorators.js'

import '@canton-network/core-wallet-ui-components'

import { Wallet } from '@canton-network/core-wallet-store'
import { userClient } from '../rpc-client'
import { CreateWalletParams } from '@canton-network/core-wallet-user-rpc-client'
import { SigningProvider } from '@canton-network/core-signing-lib'

import '../index'

@customElement('user-ui-wallets')
export class UserUiWallets extends LitElement {
    @state()
    accessor signingProviders: string[] = Object.values(SigningProvider)

    @state()
    accessor networks: string[] = []

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

    @query('#network-id')
    accessor _networkSelect: HTMLSelectElement | null = null

    @query('#primary')
    accessor _primaryCheckbox: HTMLInputElement | null = null

    static styles = css`
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
            <user-ui-nav></user-ui-nav>
            <h1>Wallets UI</h1>

            <h2>Primary Wallet</h2>
            <form id="primary-wallet-form">
                <label for="primary-wallet-select"
                    >Select Primary Wallet:</label
                >
                <select
                    class="form-control"
                    id="primary-wallet-select"
                    @change=${async (e: Event) => {
                        const select = e.target as HTMLSelectElement
                        const selectedWalletId = select.value
                        if (selectedWalletId) {
                            await userClient.request('setPrimaryWallet', {
                                partyId: selectedWalletId,
                            })
                            this.updateWallets()
                        }
                    }}
                >
                    <option disabled value="">Select a wallet</option>
                    ${this.wallets.map(
                        (wallet) =>
                            html` <option
                                value=${wallet.partyId}
                                .selected=${wallet.primary}
                            >
                                ${wallet.hint}
                                ${wallet.primary ? '(Primary)' : ''}
                            </option>`
                    )}
                </select>
            </form>

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
                        (providerId) =>
                            html`<option value=${providerId}>
                                ${providerId}
                            </option>`
                    )}
                </select>

                <label for="network-id">Network:</label>
                <select class="form-control" id="network-id">
                    <option disabled value="">Select a network</option>
                    ${this.networks.map(
                        (networkId) =>
                            html`<option value=${networkId}>
                                ${networkId}
                            </option>`
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
        this.updateWallets()
        this.updateNetworks()
    }

    private async updateNetworks() {
        userClient.request('listNetworks').then(({ networks }) => {
            this.networks = networks.map((network) => network.chainId)
        })
    }

    private async updateWallets() {
        userClient.request('listWallets', []).then((wallets) => {
            this.wallets = wallets || []
        })
    }

    private async createWallet() {
        this.loading = true

        const partyHint = this._partyHintInput?.value || ''
        const primary = this._primaryCheckbox?.checked || false
        const signingProviderId = this._signingProviderSelect?.value || ''
        const chainId = this._networkSelect?.value || ''

        const body: CreateWalletParams = {
            primary,
            partyHint,
            chainId,
            signingProviderId,
        }

        await userClient.request('createWallet', body)

        this.loading = false
        if (this._partyHintInput) {
            this._partyHintInput.value = ''
        }

        this.updateWallets()
    }
}
