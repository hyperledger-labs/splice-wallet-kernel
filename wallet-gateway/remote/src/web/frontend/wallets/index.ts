// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html, LitElement } from 'lit'
import { customElement, query, state } from 'lit/decorators.js'

import '@canton-network/core-wallet-ui-components'

import { Wallet } from '@canton-network/core-wallet-store'
import { createUserClient } from '../rpc-client'
import { CreateWalletParams } from '@canton-network/core-wallet-user-rpc-client'
import { SigningProvider } from '@canton-network/core-signing-lib'

import '../index'
import { stateManager } from '../state-manager'
import { handleErrorToast } from '@canton-network/core-wallet-ui-components'

export interface ToastElement extends HTMLElement {
    title: string
    message: string
    type: string
    buttonText: string
}

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

    @state()
    accessor showCreateCard = false

    @query('#party-id-hint')
    accessor _partyHintInput: HTMLInputElement | null = null

    @query('#signing-provider-id')
    accessor _signingProviderSelect: HTMLSelectElement | null = null

    @query('#network-id')
    accessor _networkSelect: HTMLSelectElement | null = null

    @query('#primary')
    accessor _primaryCheckbox: HTMLInputElement | null = null

    static styles = css`
        :host {
            display: block;
            box-sizing: border-box;
            max-width: 900px;
            margin: 0 auto;
            font-family: var(--wg-theme-font-family, Arial, sans-serif);
        }
        .header {
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .card-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1rem;
            margin: 1rem 0;
        }
        .form-card,
        .wallet-card {
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            min-width: 0;
        }
        form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        label {
            font-weight: 500;
            margin-bottom: 0.2rem;
        }
        .form-control {
            padding: 0.5rem;
            border: 1px solid var(--splice-wk-border-color, #ccc);
            border-radius: 4px;
            font-size: 1rem;
        }
        .inline {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .buttons {
            padding: 0.4rem 0.8rem;
            font-size: 1rem;
            border-radius: 4px;
            border: 1px solid #ccc;
            background: #f5f5f5;
            cursor: pointer;
            transition: background 0.2s;
        }
        .buttons:hover {
            background: #e2e6ea;
        }
        .wallet-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 0.25rem;
            color: #0052cc;
            word-break: break-all;
        }
        .wallet-meta {
            font-size: 0.95rem;
            color: #555;
            margin-bottom: 0.5rem;
            word-break: break-all;
        }
        .wallet-actions {
            display: flex;
            gap: 0.5rem;
            margin-top: 0.5rem;
        }
        @media (max-width: 600px) {
            .header h1 {
                font-size: 1.2rem;
            }
            .card-list {
                grid-template-columns: 1fr;
            }
            .wallet-card,
            .form-card {
                padding: 0.7rem;
            }
            .buttons {
                font-size: 0.9rem;
                padding: 0.3rem 0.6rem;
            }
        }
    `

    protected render() {
        const shownWallets = this.wallets.reduce(
            (acc, w) => {
                if (w.status === 'allocated') {
                    acc.verifiedWallets.push(w)
                } else {
                    acc.unverifiedWallets.push(w)
                }
                return acc
            },
            {
                verifiedWallets: [] as Wallet[],
                unverifiedWallets: [] as Wallet[],
            }
        )
        return html`
            <div class="header">
                <h1>Wallets</h1>
                <button
                    class="buttons"
                    @click=${() => (this.showCreateCard = !this.showCreateCard)}
                    style="margin-left:1rem;"
                >
                    ${this.showCreateCard ? 'Close' : 'Create New'}
                </button>
            </div>

            <div class="card-list">
                ${this.showCreateCard
                    ? html`
                          <div class="form-card">
                              <form
                                  id="create-wallet-form"
                                  @submit=${this._onCreateWalletSubmit}
                              >
                                  <label for="party-id-hint"
                                      >Party ID Hint:</label
                                  >
                                  <input
                                      ?disabled=${this.loading}
                                      class="form-control"
                                      id="party-id-hint"
                                      type="text"
                                      placeholder="Enter party ID hint"
                                      required
                                  />

                                  <label for="signing-provider-id"
                                      >Signing Provider:</label
                                  >
                                  <select
                                      class="form-control"
                                      id="signing-provider-id"
                                  >
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
                                      <option disabled value="">
                                          Select a network
                                      </option>
                                      ${this.networks.map(
                                          (networkId) =>
                                              html`<option value=${networkId}>
                                                  ${networkId}
                                              </option>`
                                      )}
                                  </select>

                                  <div class="inline">
                                      <label for="primary"
                                          >Set as primary wallet:</label
                                      >
                                      <input id="primary" type="checkbox" />
                                  </div>

                                  <button
                                      class="buttons"
                                      ?disabled=${this.loading}
                                      type="submit"
                                  >
                                      Create
                                  </button>
                              </form>
                              ${this.createdParty
                                  ? html`<p>
                                        Created party ID: ${this.createdParty}
                                    </p>`
                                  : ''}
                          </div>
                      `
                    : ''}
            </div>
            <div class="card-list">
                ${shownWallets.unverifiedWallets.map(
                    (wallet) => html`
                        <div class="wallet-card">
                            <div class="wallet-title">
                                ${wallet.hint || wallet.partyId}
                                ${wallet.primary
                                    ? html`<span
                                          style="font-size:0.95rem; color:#009900;"
                                          >(Primary)</span
                                      >`
                                    : ''}
                            </div>
                            <div class="wallet-meta">
                                <strong>Transaction ID:</strong>
                                ${wallet.externalTxId}<br />
                                <strong>Network:</strong>
                                ${wallet.networkId}<br />
                                <strong>Signing Provider:</strong>
                                ${wallet.signingProviderId}
                            </div>
                            <div class="wallet-actions">
                                <button
                                    class="buttons"
                                    ?disabled=${this.loading}
                                    @click=${() => this._allocateParty(wallet)}
                                >
                                    Allocate party
                                </button>
                            </div>
                        </div>
                    `
                )}
            </div>
            <div class="card-list">
                ${shownWallets.verifiedWallets.map(
                    (wallet) => html`
                        <div class="wallet-card">
                            <div class="wallet-title">
                                ${wallet.hint || wallet.partyId}
                                ${wallet.primary
                                    ? html`<span
                                          style="font-size:0.95rem; color:#009900;"
                                          >(Primary)</span
                                      >`
                                    : ''}
                            </div>
                            <div class="wallet-meta">
                                <strong>Party ID:</strong>
                                ${wallet.partyId}<br />
                                <strong>Network:</strong>
                                ${wallet.networkId}<br />
                                <strong>Signing Provider:</strong>
                                ${wallet.signingProviderId}
                            </div>
                            <div class="wallet-actions">
                                <button
                                    class="buttons"
                                    @click=${() => this._setPrimary(wallet)}
                                >
                                    Set Primary
                                </button>
                                <button
                                    class="buttons"
                                    @click=${() =>
                                        this._copyPartyId(wallet.partyId)}
                                >
                                    Copy Party ID
                                </button>
                            </div>
                        </div>
                    `
                )}
            </div>
        `
    }

    connectedCallback(): void {
        super.connectedCallback()
        this.updateWallets()
        this.updateNetworks()
    }

    private async updateNetworks() {
        const userClient = await createUserClient(
            stateManager.accessToken.get()
        )
        userClient.request('listNetworks').then(({ networks }) => {
            this.networks = networks.map((network) => network.id)
        })
    }

    private async updateWallets() {
        const userClient = await createUserClient(
            stateManager.accessToken.get()
        )
        userClient.request('listWallets', []).then((wallets) => {
            this.wallets = wallets || []
        })
    }

    private async _setPrimary(wallet: Wallet) {
        const userClient = await createUserClient(
            stateManager.accessToken.get()
        )
        await userClient.request('setPrimaryWallet', {
            partyId: wallet.partyId,
        })
        this.updateWallets()
    }

    private _copyPartyId(partyId: string) {
        navigator.clipboard.writeText(partyId)
    }

    private async _onCreateWalletSubmit(e: Event) {
        e.preventDefault()
        this.loading = true

        const partyHint = this._partyHintInput?.value || ''
        const primary = this._primaryCheckbox?.checked || false
        const signingProviderId = this._signingProviderSelect?.value || ''
        const networkId = this._networkSelect?.value || ''

        try {
            const body: CreateWalletParams = {
                primary,
                partyHint,
                networkId,
                signingProviderId,
            }

            const userClient = await createUserClient(
                stateManager.accessToken.get()
            )
            await userClient.request('createWallet', body)
        } catch (e) {
            handleErrorToast(e)
        }

        this.loading = false
        if (this._partyHintInput) {
            this._partyHintInput.value = ''
        }

        this.updateWallets()
    }

    private async _allocateParty(wallet: Wallet) {
        this.loading = true
        try {
            const userClient = await createUserClient(
                stateManager.accessToken.get()
            )
            await userClient.request('createWallet', {
                primary: wallet.primary,
                partyHint: wallet.hint,
                networkId: wallet.networkId,
                signingProviderId: wallet.signingProviderId,
                signingProviderContext: {
                    partyId: wallet.partyId,
                    externalTxId: wallet.externalTxId || '',
                    topologyTransactions: wallet.topologyTransactions || '',
                    namespace: wallet.namespace,
                },
            })
        } catch (e) {
            handleErrorToast(e)
        }

        this.loading = false
        this.updateWallets()
    }
}
