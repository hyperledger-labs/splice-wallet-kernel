// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'

import { Wallet } from '@canton-network/core-wallet-user-rpc-client'
import UserApiClient from '@canton-network/core-wallet-user-rpc-client'
import { SigningProvider } from '@canton-network/core-signing-lib'

import {
    BaseElement,
    Toast,
    WalletSetPrimaryEvent,
    WalletAllocateEvent,
    handleErrorToast,
    toRelPath,
} from '@canton-network/core-wallet-ui-components'
import { createUserClient } from '../rpc-client'

import '../index'
import { stateManager } from '../state-manager'

@customElement('user-ui-parties')
export class UserUiParties extends BaseElement {
    @state()
    accessor wallets: Wallet[] | undefined = undefined

    @state()
    accessor loading = false

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

            .page-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: var(--wg-space-3);
                margin-bottom: var(--wg-space-4);
            }

            .page-title-wrap {
                display: inline-flex;
                align-items: center;
                gap: var(--wg-space-2);
            }

            .btn-add {
                padding: 0.45rem 1.1rem;
            }
        `,
    ]

    protected render() {
        if (!this.client) {
            return html``
        }

        const shownWallets = {
            verifiedWallets: [] as Wallet[],
            unverifiedWallets: [] as Wallet[],
        }

        this.wallets?.forEach((wallet) => {
            if (wallet.status === 'allocated') {
                shownWallets.verifiedWallets.push(wallet)
            } else {
                shownWallets.unverifiedWallets.push(wallet)
            }
        })

        return html`
            <div class="page-header">
                <div class="page-title-wrap">
                    <h1 class="h4 fw-semibold mb-0">Parties</h1>
                    <wg-wallets-sync
                        .client=${this.client}
                        .wallets=${this.wallets}
                        @sync-success=${this.updateWallets}
                    ></wg-wallets-sync>
                </div>

                <button
                    class="btn btn-primary btn-sm rounded-pill btn-add"
                    type="button"
                    @click=${() =>
                        (window.location.href = toRelPath('/parties/add/'))}
                >
                    <span aria-hidden="true">+</span>
                    New
                </button>
            </div>

            ${this.wallets === undefined
                ? html`<p class="text-body-secondary mb-3">
                      Loading parties...
                  </p>`
                : ''}

            <div class="row g-3 my-1">
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

            <div class="row g-3 my-1">
                ${shownWallets.verifiedWallets.map(
                    (wallet) => html`
                        <div class="col-md-6 col-lg-4">
                            <wg-wallet-card
                                .wallet=${wallet}
                                verified
                                ?loading=${this.loading}
                                @wallet-set-primary=${this._onSetPrimary}
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
        this.showCreationToastIfNeeded()
        this.updateWallets()
    }

    private showCreationToastIfNeeded() {
        const searchParams = new URLSearchParams(window.location.search)
        if (searchParams.get('created') !== '1') {
            return
        }

        const toast = new Toast()
        toast.title = 'Party created'
        toast.message = 'Your new party has been added successfully.'
        toast.type = 'success'
        document.body.appendChild(toast)

        searchParams.delete('created')
        const query = searchParams.toString()
        const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
        window.history.replaceState({}, '', nextUrl)
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
                },
            })
        } catch (err) {
            handleErrorToast(err)
        }

        this.loading = false
        this.updateWallets()
    }
}
