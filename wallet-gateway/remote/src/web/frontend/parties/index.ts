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
import {
    PARTY_STATUS_PARAM,
    allocationResultToast,
    isWalletSyncNeeded,
    loadWallets,
    partyStatusToast,
    syncWallets,
    walletSyncResultToast,
} from '@canton-network/core-wallet-ui-components/logic'
import { createUserClient } from '../rpc-client'
import { setLocationHref } from '../navigation.js'

import '../index'
import { stateManager } from '../state-manager'
import { showToast } from '../utils'
import { detectCurrentOrigin } from '../listeners.js'
import { SigningProvider } from '@canton-network/core-signing-lib'

@customElement('user-ui-parties')
export class UserUiParties extends BaseElement {
    @state()
    accessor wallets: Wallet[] | undefined = undefined

    @state()
    accessor loading = false

    @state()
    accessor client: UserApiClient | null = null

    @state()
    accessor syncNeeded = false

    @state()
    accessor syncing = false

    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: block;
                max-width: 900px;
                margin: 0 auto;
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

        return html`
            <wg-page-header heading="Parties">
                <wg-wallets-sync
                    slot="title-suffix"
                    ?syncNeeded=${this.syncNeeded}
                    ?syncing=${this.syncing}
                    @wallets-sync=${this._onWalletsSync}
                ></wg-wallets-sync>

                <button
                    class="btn btn-primary btn-sm rounded-pill btn-add"
                    type="button"
                    @click=${() => setLocationHref(toRelPath('/parties/add/'))}
                >
                    <span class="btn-add-icon" aria-hidden="true">+</span>
                    <span>New</span>
                </button>
            </wg-page-header>

            <wg-wallet-list
                .wallets=${this.wallets}
                ?loading=${this.loading}
                nonEditableSigningProviderId=${SigningProvider.PARTICIPANT}
                @wallet-allocate=${this._onAllocateParty}
                @wallet-edit=${this._onWalletEdit}
                @wallet-set-primary=${this._onSetPrimary}
            ></wg-wallet-list>
        `
    }

    async connectedCallback(): Promise<void> {
        super.connectedCallback()
        const currentOrigin = await detectCurrentOrigin()
        this.client = await createUserClient(
            await stateManager.accessToken.get(currentOrigin)
        )
        this.showCreationToastIfNeeded()
        void this.refreshSyncNeeded()
        void this.updateWallets()
    }

    private showCreationToastIfNeeded() {
        const url = new URL(window.location.href)
        const toast = partyStatusToast(url.searchParams.get(PARTY_STATUS_PARAM))
        if (toast) {
            showToast(toast.title, toast.message, toast.type)
        }

        url.searchParams.delete(PARTY_STATUS_PARAM)
        window.history.replaceState({}, '', url.toString())
    }

    private async refreshSyncNeeded() {
        if (!this.client) return
        this.syncNeeded = await isWalletSyncNeeded(this.client)
    }

    private async updateWallets() {
        const currentOrigin = await detectCurrentOrigin()
        const userClient = await createUserClient(
            await stateManager.accessToken.get(currentOrigin)
        )

        this.wallets = await loadWallets(
            userClient,
            await stateManager.networkId.get(currentOrigin)
        )
    }

    private async _onWalletsSync() {
        if (!this.client || this.syncing) return
        this.syncing = true
        try {
            const toast = walletSyncResultToast(await syncWallets(this.client))
            showToast(toast.title, toast.message, toast.type)
            await this.refreshSyncNeeded()
            await this.updateWallets()
        } catch (error) {
            handleErrorToast(error)
        } finally {
            this.syncing = false
        }
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
            const toast = result?.wallet
                ? allocationResultToast(result.wallet.status)
                : undefined
            if (toast) {
                showToast(toast.title, toast.message, toast.type)
            }
        } catch (err) {
            handleErrorToast(err)
        }

        this.loading = false
        void this.updateWallets()
    }
}
