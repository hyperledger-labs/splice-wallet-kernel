// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'

import {
    BaseElement,
    handleErrorToast,
    WalletCreateEvent,
    WalletSetPrimaryEvent,
    WalletCopyPartyIdEvent,
    WalletAllocateEvent,
    WgWalletCreateForm,
} from '@canton-network/core-wallet-ui-components'

import { Wallet } from '@canton-network/core-wallet-store'
import { createUserClient } from '../rpc-client'
import UserApiClient from '@canton-network/core-wallet-user-rpc-client'
import { SigningProvider } from '@canton-network/core-signing-lib'

import '../index'
import { stateManager } from '../state-manager'

@customElement('user-ui-wallets')
export class UserUiWallets extends BaseElement {
    @state()
    accessor signingProviders: string[] = Object.values(SigningProvider)

    @state()
    accessor wallets: Wallet[] | undefined = undefined

    @state()
    accessor loading = false

    @state()
    accessor showCreateCard = false

    @state()
    accessor client: UserApiClient | null = null

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

            ${this.wallets === undefined ? 'Loading wallets\u2026' : ''}

            <div class="row g-3 my-3">
                ${this.showCreateCard
                    ? html`
                          <div class="col-md-6 col-lg-4">
                              <wg-wallet-create-form
                                  .signingProviders=${this.signingProviders}
                                  ?loading=${this.loading}
                                  @wallet-create=${this._onCreateWallet}
                              ></wg-wallet-create-form>
                          </div>
                      `
                    : ''}
            </div>
            <div class="row g-3 my-3">
                ${shownWallets.unverifiedWallets.map(
                    (wallet) => html`
                        <div class="col-md-6 col-lg-4">
                            <wg-wallet-card
                                .wallet=${wallet}
                                ?loading=${this.loading}
                                @wallet-allocate=${this._onAllocateParty}
                            ></wg-wallet-card>
                        </div>
                    `
                )}
            </div>
            <div class="row g-3 my-3">
                ${shownWallets.verifiedWallets.map(
                    (wallet) => html`
                        <div class="col-md-6 col-lg-4">
                            <wg-wallet-card
                                .wallet=${wallet}
                                verified
                                ?loading=${this.loading}
                                @wallet-set-primary=${this._onSetPrimary}
                                @wallet-copy-party-id=${this._onCopyPartyId}
                            ></wg-wallet-card>
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

    private async _onSetPrimary(e: WalletSetPrimaryEvent) {
        const userClient = await createUserClient(
            stateManager.accessToken.get()
        )
        await userClient.request({
            method: 'setPrimaryWallet',
            params: {
                partyId: e.wallet.partyId,
            },
        })
        this.updateWallets()
    }

    private _onCopyPartyId(e: WalletCopyPartyIdEvent) {
        navigator.clipboard.writeText(e.partyId)
    }

    private async _onCreateWallet(e: WalletCreateEvent) {
        this.loading = true

        const partyHint = e.partyHint
        const primary = e.primary
        const signingProviderId = e.signingProviderId

        try {
            const userClient = await createUserClient(
                stateManager.accessToken.get()
            )
            await userClient.request({
                method: 'createWallet',
                params: {
                    primary,
                    partyHint,
                    signingProviderId,
                },
            })
        } catch (err) {
            handleErrorToast(err)
        }

        this.loading = false
        const form = this.renderRoot.querySelector<WgWalletCreateForm>(
            'wg-wallet-create-form'
        )
        form?.reset()

        this.updateWallets()
    }

    private async _onAllocateParty(e: WalletAllocateEvent) {
        this.loading = true
        const wallet = e.wallet
        try {
            const userClient = await createUserClient(
                stateManager.accessToken.get()
            )
            await userClient.request({
                method: 'createWallet',
                params: {
                    primary: wallet.primary,
                    partyHint: wallet.hint,
                    signingProviderId: wallet.signingProviderId,
                    signingProviderContext: {
                        partyId: wallet.partyId,
                        externalTxId: wallet.externalTxId || '',
                        topologyTransactions: wallet.topologyTransactions || '',
                        namespace: wallet.namespace,
                    },
                },
            })
        } catch (err) {
            handleErrorToast(err)
        }

        this.loading = false
        this.updateWallets()
    }
}
