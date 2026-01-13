// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { BaseElement } from '../internal/BaseElement'
import UserApiClient from '@canton-network/core-wallet-user-rpc-client'
import { infoCircleFillIcon } from '../icons'
import { handleErrorToast } from '../handle-errors'

@customElement('wg-wallets-sync')
export class WgWalletsSync extends BaseElement {
    static styles = [
        BaseElement.styles,
        css`
            .icon svg {
                width: 1.2rem;
                height: 1.2rem;
                fill: currentColor;
            }
        `,
    ]

    @property({ attribute: false }) client: UserApiClient | null = null

    @state() accessor isSyncNeeded = false
    @state() accessor isSyncing = false

    connectedCallback(): void {
        super.connectedCallback()
        this.checkWalletSyncNeeded()
    }

    updated(changedProperties: Map<string | number | symbol, unknown>): void {
        super.updated(changedProperties)
        // Re-check when client changes
        if (changedProperties.has('client')) {
            this.checkWalletSyncNeeded()
        }
    }

    private async checkWalletSyncNeeded() {
        if (!this.client) return

        try {
            const result = await this.client.request('isWalletSyncNeeded')
            this.isSyncNeeded = result?.walletSyncNeeded === true
        } catch {
            // Silently fail - if we can't check, we'll just not show the component
            this.isSyncNeeded = false
        }
    }

    syncWallets = async () => {
        if (!this.client || this.isSyncing) return

        this.isSyncing = true
        try {
            const result = await this.client.request('syncWallets')
            // TODO maybe let's add something about disabled ones
            alert(
                `Wallet sync completed:\n ➕ ${result?.added.length} new wallets. \n ➖ ${result?.removed.length} old wallets.`
            )
            // Re-check if sync is needed after sync
            await this.checkWalletSyncNeeded()
        } catch (e) {
            handleErrorToast(e)
        } finally {
            this.isSyncing = false
        }
    }

    protected render() {
        // Only show if sync is needed (disabled wallets or new parties on ledger)
        if (!this.isSyncNeeded) {
            return html``
        }

        return html`
            <div class="mb-5">
                <div class="header"><h1>Wallets</h1></div>
                <div
                    class="alert alert-primary d-flex align-items-center py-2"
                    role="alert"
                >
                    <span class="icon me-2">${infoCircleFillIcon}</span>
                    Keep your wallets in sync with the connected network.
                </div>
                <button
                    class="btn btn-primary"
                    .disabled=${!this.client || this.isSyncing}
                    @click=${this.syncWallets}
                >
                    ${this.isSyncing ? 'Syncing...' : 'Sync Wallets'}
                </button>
            </div>
        `
    }
}
