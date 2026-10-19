// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'

import type { Wallet } from '@canton-network/core-wallet-user-rpc-client'
import type UserApiClient from '@canton-network/core-wallet-user-rpc-client'

import {
    BaseElement,
    type WalletSetPrimaryEvent,
    type WalletAllocateEvent,
    handleErrorToast,
    toRelPath,
    type WalletCardEditEvent,
    toRelHref,
} from '@canton-network/core-wallet-ui-components'
import { createUserClient } from '../rpc-client'
import { setLocationHref } from '../navigation.js'

import '../index'
import { stateManager } from '../state-manager'
import { showToast } from '../utils'
import { detectCurrentOrigin } from '../listeners.js'
import { SigningProvider } from '@canton-network/core-signing-lib'

export enum WALLET_STATUS_CODE {
    WALLET_ALLOCATED = '1',
    WALLET_INITIALIZED = '2',
    WALLET_REMOVED = '3',
    WALLET_EDITED = '4',
}

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
                gap: 0.15rem;
            }

            .page-title-wrap > h1 {
                line-height: 1.2;
            }

            .btn-add {
                padding: 0.45rem 1.1rem;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 0.35rem;
            }

            .btn-add-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                line-height: 1;
                font-size: var(--wg-font-size-base);
                font-weight: var(--wg-font-weight-medium);
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
                    @click=${() => setLocationHref(toRelPath('/parties/add/'))}
                >
                    <span class="btn-add-icon" aria-hidden="true">+</span>
                    <span>New</span>
                </button>
            </div>

            ${
                this.wallets === undefined
                    ? html`<p class="text-body-secondary mb-3">
                          Loading parties...
                      </p>`
                    : ''
            }

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
                                .editable=${wallet.signingProviderId !== SigningProvider.PARTICIPANT}
                                ?loading=${this.loading}
                                @wallet-edit=${this._onWalletEdit}
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
        const currentOrigin = await detectCurrentOrigin()
        this.client = await createUserClient(
            await stateManager.accessToken.get(currentOrigin)
        )
        this.showCreationToastIfNeeded()
        void this.updateWallets()
    }

    private showCreationToastIfNeeded() {
        const url = new URL(window.location.href)
        const createdParam = url.searchParams.get('createPartyStatus')

        switch (createdParam) {
            case WALLET_STATUS_CODE.WALLET_ALLOCATED:
                showToast(
                    'Party created',
                    'Your new party has been created successfully.',
                    'success'
                )
                break
            case WALLET_STATUS_CODE.WALLET_INITIALIZED:
                showToast(
                    'Party creation pending',
                    'Complete the signing in your signing provider, then click Allocate to finish.',
                    'info'
                )
                break
            case WALLET_STATUS_CODE.WALLET_REMOVED:
                showToast(
                    'Party creation rejected',
                    'Party creation failed because the signing transaction was unsuccessful.',
                    'error'
                )
                break
            case WALLET_STATUS_CODE.WALLET_EDITED:
                showToast(
                    'Party edited',
                    'Your party has been edited successfully.',
                    'success'
                )
                break
            default:
        }

        url.searchParams.delete('createPartyStatus')
        window.history.replaceState({}, '', url.toString())
    }

    private async updateWallets() {
        const currentOrigin = await detectCurrentOrigin()
        const userClient = await createUserClient(
            await stateManager.accessToken.get(currentOrigin)
        )

        const sessions = await userClient
            .request({ method: 'listSessions' })
            .catch(() => ({ sessions: [] }))
        const currentSession = sessions?.sessions?.[0]
        const networkId =
            currentSession?.network?.id ||
            stateManager.networkId.get(currentOrigin)

        const filter = networkId ? { networkIds: [networkId] } : undefined
        void userClient
            .request({
                method: 'listWallets',
                params: filter ? { filter } : {},
            })
            .then((wallets) => {
                this.wallets = wallets || []
            })
    }

    private _onWalletEdit(e: WalletCardEditEvent) {
        setLocationHref(
            `${toRelHref('/parties/edit')}?partyId=${encodeURIComponent(e.wallet.partyId)}`
        )
    }

    private async _onSetPrimary(e: WalletSetPrimaryEvent) {
        const currentOrigin = await detectCurrentOrigin()
        const userClient = await createUserClient(
            await stateManager.accessToken.get(currentOrigin)
        )
        await userClient.request({
            method: 'setPrimaryWallet',
            params: {
                partyId: e.wallet.partyId,
            },
        })
        void this.updateWallets()
    }

    private async _onAllocateParty(e: WalletAllocateEvent) {
        this.loading = true
        const wallet = e.wallet
        try {
            const currentOrigin = await detectCurrentOrigin()
            const userClient = await createUserClient(
                await stateManager.accessToken.get(currentOrigin)
            )
            const result = await userClient.request({
                method: 'allocatePartyForWallet',
                params: {
                    partyId: wallet.partyId,
                },
            })
            if (result?.wallet) {
                if (result.wallet.status === 'removed') {
                    showToast(
                        'Party removed',
                        'Party was removed because the signing transaction was unsuccessful.',
                        'error'
                    )
                } else if (result.wallet.status === 'allocated') {
                    showToast(
                        'Party allocated',
                        'Party has been successfully allocated.',
                        'success'
                    )
                } else if (result.wallet.status === 'initialized') {
                    showToast(
                        'Transaction pending',
                        'The signing transaction is still pending. Please approve it in selected signing provider, then try again.',
                        'info'
                    )
                }
            }
        } catch (err) {
            handleErrorToast(err)
        }

        this.loading = false
        void this.updateWallets()
    }
}
