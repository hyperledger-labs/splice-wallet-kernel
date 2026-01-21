// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element'
import UserApiClient, {
    Wallet,
} from '@canton-network/core-wallet-user-rpc-client'
import { handleErrorToast } from '../handle-errors'
import { Toast } from './custom-toast'

@customElement('wg-wallets-sync')
export class WgWalletsSync extends BaseElement {
    static styles = [
        BaseElement.styles,
        css`
            .sync-container {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
            }

            .sync-button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 1.5rem;
                height: 1.5rem;
                border-radius: 50%;
                border: none;
                background-color: var(--bs-primary);
                color: white;
                cursor: pointer;
                transition: all 0.2s;
                position: relative;
            }

            .sync-button:hover:not(:disabled) {
                background-color: var(--bs-primary-dark, #0056b3);
                transform: scale(1.05);
            }

            .sync-button:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .sync-button.out-of-sync {
                background-color: var(--bs-warning, #ffc107);
                animation: pulse 2s infinite;
            }

            .sync-button.out-of-sync:hover:not(:disabled) {
                background-color: var(--bs-warning-dark, #e0a800);
            }

            .sync-icon {
                width: 1.25rem;
                height: 1.25rem;
                fill: currentColor;
            }

            .sync-icon.spinning {
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                from {
                    transform: rotate(0deg);
                }
                to {
                    transform: rotate(360deg);
                }
            }

            @keyframes pulse {
                0%,
                100% {
                    opacity: 1;
                }
                50% {
                    opacity: 0.7;
                }
            }

            .sync-status {
                font-size: 0.875rem;
                color: var(--bs-secondary);
            }
        `,
    ]

    @property() wallets: Wallet[] = []
    @property({ attribute: false }) client: UserApiClient | null = null

    @state() accessor isSyncNeeded = false
    @state() accessor isSyncing = false

    connectedCallback(): void {
        super.connectedCallback()
        this.checkWalletSyncNeeded()
    }

    private async checkWalletSyncNeeded() {
        if (!this.client) return

        try {
            const result = await this.client.request('isWalletSyncNeeded')
            this.isSyncNeeded = result?.walletSyncNeeded === true
        } catch {
            // Check failed, assume we need sync and render button to allow state recovery
            this.isSyncNeeded = true
        }
    }

    syncWallets = async () => {
        if (!this.client || this.isSyncing) return

        this.isSyncing = true
        try {
            const result = await this.client.request('syncWallets')
            const added = result?.added || []
            const removed = result?.removed || []
            const disabledAdded = added.filter((w) => w.disabled === true)

            // Update Wallets list
            const removedIds = new Set(removed.map((w) => w.id))
            this.wallets = this.wallets.filter((w) => !removedIds.has(w.id))
            this.wallets = [...this.wallets, ...added]

            let message = `Added: ${added.length} wallet${added.length !== 1 ? 's' : ''}`
            if (disabledAdded.length > 0) {
                message += ` (${disabledAdded.length} disabled)`
            }
            message += `. Removed: ${removed.length} wallet${removed.length !== 1 ? 's' : ''}.`

            const toast = new Toast()
            toast.title = 'Wallet Sync Complete'
            toast.message = message
            toast.type = 'success'
            document.body.appendChild(toast)

            // Re-check if sync is needed after sync
            await this.checkWalletSyncNeeded()
        } catch (e) {
            handleErrorToast(e)
        } finally {
            this.isSyncing = false
        }
    }

    protected render() {
        const syncIcon = html`
            <svg
                class="sync-icon ${this.isSyncing ? 'spinning' : ''}"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
            >
                <path
                    fill-rule="evenodd"
                    d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"
                />
                <path
                    d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"
                />
            </svg>
        `

        return html`
            <div class="sync-container">
                <button
                    class="sync-button ${this.isSyncNeeded
                        ? 'out-of-sync'
                        : ''}"
                    .disabled=${!this.client || this.isSyncing}
                    @click=${this.syncWallets}
                    title="${this.isSyncing
                        ? 'Syncing...'
                        : this.isSyncNeeded
                          ? 'need sync'
                          : 'in sync'}"
                >
                    ${syncIcon}
                </button>
            </div>
        `
    }
}
