// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html } from 'lit'
import { customElement, query, state } from 'lit/decorators.js'

import {
    BaseElement,
    handleErrorToast,
} from '@canton-network/core-wallet-ui-components'

import { Wallet } from '@canton-network/core-wallet-store'
import { createUserClient } from '../rpc-client'
import UserApiClient from '@canton-network/core-wallet-user-rpc-client'
import { SigningProvider } from '@canton-network/core-signing-lib'

import '../index'
import { stateManager } from '../state-manager'

export interface ToastElement extends HTMLElement {
    title: string
    message: string
    type: string
    buttonText: string
}

@customElement('user-ui-wallets')
export class UserUiWallets extends BaseElement {
    @state()
    accessor signingProviders: string[] = Object.values(SigningProvider)

    @state()
    accessor networks: string[] = []

    @state()
    accessor wallets: Wallet[] | undefined = undefined

    @state()
    accessor createdParty = undefined

    @state()
    accessor loading = false

    @state()
    accessor showCreateCard = false

    @state()
    accessor client: UserApiClient | null = null

    @query('#party-id-hint')
    accessor _partyHintInput: HTMLInputElement | null = null

    @query('#signing-provider-id')
    accessor _signingProviderSelect: HTMLSelectElement | null = null

    @query('#network-id')
    accessor _networkSelect: HTMLSelectElement | null = null

    @query('#primary')
    accessor _primaryCheckbox: HTMLInputElement | null = null

    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: block;
                max-width: 900px;
                margin: 0 auto;
            }
        `,
    ]

    protected render() {
        // This prevents race condition between render and this.client being set in connectedCallback asynchronously,
        // resulting in <wg-wallets-sync> keeping client as null
        if (!this.client) {
            return html``
        }

        const shownWallets = {
            verifiedWallets: [] as Wallet[],
            unverifiedWallets: [] as Wallet[],
        }
        this.wallets?.forEach((w) => {
            if (w.status === 'allocated') {
                shownWallets.verifiedWallets.push(w)
            } else {
                shownWallets.unverifiedWallets.push(w)
            }
        })
        return html`
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h1>
                    Wallets
                    <wg-wallets-sync
                        .client=${this.client}
                        .wallets=${this.wallets}
                        @sync-success=${this.updateWallets}
                    ></wg-wallets-sync>
                </h1>

                <button
                    class="btn btn-outline-secondary ms-3"
                    @click=${() => (this.showCreateCard = !this.showCreateCard)}
                >
                    ${this.showCreateCard ? 'Close' : 'Create New'}
                </button>
            </div>

            ${this.wallets === undefined ? 'Loading wallets…' : ''}

            <div class="row g-3 my-3">
                ${this.showCreateCard
                    ? html`
                          <div class="col-md-6 col-lg-4">
                              <div class="card shadow-sm">
                                  <div class="card-body">
                                      <form
                                          id="create-wallet-form"
                                          @submit=${this._onCreateWalletSubmit}
                                      >
                                          <div class="mb-3">
                                              <label
                                                  for="party-id-hint"
                                                  class="form-label"
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
                                          </div>

                                          <div class="mb-3">
                                              <label
                                                  for="signing-provider-id"
                                                  class="form-label"
                                                  >Signing Provider:</label
                                              >
                                              <select
                                                  class="form-select"
                                                  id="signing-provider-id"
                                              >
                                                  <option disabled value="">
                                                      Signing provider for
                                                      wallet
                                                  </option>
                                                  ${this.signingProviders.map(
                                                      (providerId) =>
                                                          html`<option
                                                              value=${providerId}
                                                          >
                                                              ${providerId}
                                                          </option>`
                                                  )}
                                              </select>
                                          </div>

                                          <div
                                              class="mb-3 form-check d-flex align-items-center gap-2"
                                          >
                                              <input
                                                  id="primary"
                                                  type="checkbox"
                                                  class="form-check-input"
                                              />
                                              <label
                                                  for="primary"
                                                  class="form-check-label"
                                                  >Set as primary wallet</label
                                              >
                                          </div>

                                          <button
                                              class="btn btn-primary"
                                              ?disabled=${this.loading}
                                              type="submit"
                                          >
                                              Create
                                          </button>
                                      </form>
                                      ${this.createdParty
                                          ? html`<p class="mt-2">
                                                Created party ID:
                                                ${this.createdParty}
                                            </p>`
                                          : ''}
                                  </div>
                              </div>
                          </div>
                      `
                    : ''}
            </div>
            <div class="row g-3 my-3">
                ${shownWallets.unverifiedWallets.map(
                    (wallet) => html`
                        <div class="col-md-6 col-lg-4">
                            <div class="card shadow-sm">
                                <div class="card-body">
                                    <h5
                                        class="card-title text-primary fw-semibold text-break"
                                    >
                                        ${wallet.hint || wallet.partyId}
                                        ${wallet.primary
                                            ? html`<span class="text-success"
                                                  >(Primary)</span
                                              >`
                                            : ''}
                                        ${wallet.disabled
                                            ? html`<span class="text-danger"
                                                  >(Disabled)</span
                                              >`
                                            : ''}
                                    </h5>
                                    <p class="card-text text-muted text-break">
                                        <strong>Party ID:</strong>
                                        ${wallet.partyId}<br />
                                        <strong>Network:</strong>
                                        ${wallet.networkId}<br />
                                        <strong>Signing Provider:</strong>
                                        ${wallet.signingProviderId}
                                        ${wallet.disabled
                                            ? html`<br /><strong
                                                      >Disabled:</strong
                                                  >
                                                  Yes`
                                            : ''}
                                        ${wallet.reason
                                            ? html`<br />
                                                  <strong>Reason:</strong>
                                                  ${wallet.reason}`
                                            : ''}
                                    </p>
                                    <div class="d-flex gap-2 mt-2">
                                        <button
                                            class="btn btn-sm btn-outline-secondary"
                                            ?disabled=${this.loading}
                                            @click=${() =>
                                                this._allocateParty(wallet)}
                                        >
                                            Allocate party
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `
                )}
            </div>
            <div class="row g-3 my-3">
                ${shownWallets.verifiedWallets.map(
                    (wallet) => html`
                        <div class="col-md-6 col-lg-4">
                            <div class="card shadow-sm">
                                <div class="card-body">
                                    <h5
                                        class="card-title text-primary fw-semibold text-break"
                                    >
                                        ${wallet.hint || wallet.partyId}
                                        ${wallet.primary
                                            ? html`<span class="text-success"
                                                  >(Primary)</span
                                              >`
                                            : ''}
                                        ${wallet.disabled
                                            ? html`<span class="text-danger"
                                                  >(Disabled)</span
                                              >`
                                            : ''}
                                    </h5>
                                    <p class="card-text text-muted text-break">
                                        <strong>Party ID:</strong>
                                        ${wallet.partyId}<br />
                                        <strong>Network:</strong>
                                        ${wallet.networkId}<br />
                                        <strong>Signing Provider:</strong>
                                        ${wallet.signingProviderId}
                                        ${wallet.disabled
                                            ? html`<br /><strong
                                                      >Disabled:</strong
                                                  >
                                                  Yes`
                                            : ''}
                                        ${wallet.reason
                                            ? html`<br />
                                                  <strong>Reason:</strong>
                                                  ${wallet.reason}`
                                            : ''}
                                    </p>
                                    <div class="d-flex gap-2 mt-2">
                                        <button
                                            class="btn btn-sm btn-outline-secondary"
                                            ?disabled=${wallet.disabled}
                                            @click=${() =>
                                                this._setPrimary(wallet)}
                                        >
                                            Set Primary
                                        </button>
                                        <button
                                            class="btn btn-sm btn-outline-secondary"
                                            @click=${() =>
                                                this._copyPartyId(
                                                    wallet.partyId
                                                )}
                                        >
                                            Copy Party ID
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `
                )}
            </div>
        `
    }

    async connectedCallback(): Promise<void> {
        super.connectedCallback()
        this.client = await createUserClient(stateManager.accessToken.get())
        this.updateWallets()
    }

    private async updateWallets() {
        const userClient = await createUserClient(
            stateManager.accessToken.get()
        )

        const sessions = await userClient
            .request({ method: 'listSessions' })
            .catch(() => ({ sessions: [] }))
        const currentSession = sessions?.sessions?.[0]
        const networkId =
            currentSession?.network?.id || stateManager.networkId.get()

        const filter = networkId ? { networkIds: [networkId] } : undefined
        userClient
            .request({
                method: 'listWallets',
                params: filter ? { filter } : {},
            })
            .then((wallets) => {
                this.wallets = wallets || []
            })
    }

    private async _setPrimary(wallet: Wallet) {
        const userClient = await createUserClient(
            stateManager.accessToken.get()
        )
        await userClient.request({
            method: 'setPrimaryWallet',
            params: {
                partyId: wallet.partyId,
            },
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
            const userClient = await createUserClient(
                stateManager.accessToken.get()
            )
            await userClient.request({
                method: 'createWallet',
                params: {
                    primary,
                    partyHint,
                    networkId,
                    signingProviderId,
                },
            })
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
            await userClient.request({
                method: 'createWallet',
                params: {
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
                },
            })
        } catch (e) {
            handleErrorToast(e)
        }

        this.loading = false
        this.updateWallets()
    }
}
