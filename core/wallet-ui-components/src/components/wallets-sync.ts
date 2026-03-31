// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element'
import UserApiClient from '@canton-network/core-wallet-user-rpc-client'
import { refreshIcon } from '../icons'
import { handleErrorToast } from '../handle-errors'
import { Toast } from './custom-toast'

@customElement('wg-wallets-sync')
export class WgWalletsSync extends BaseElement {
    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: inline-flex;
                align-items: center;
                line-height: 1;
                vertical-align: middle;
            }

            .sync-button {
                border: none;
                background: transparent;
                color: var(--wg-text-secondary);
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 1.4rem;
                height: 1.4rem;
                padding: 0;
                line-height: 1;
                border-radius: var(--wg-radius-full);
                transition:
                    color 0.2s ease,
                    background-color 0.2s ease,
                    transform 0.2s ease;
            }

            .sync-button:hover:not(:disabled) {
                color: var(--wg-accent);
            }

            .sync-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .sync-button.out-of-sync {
                color: var(--wg-accent);
            }

            .sync-icon {
                width: 0.9rem;
                height: 0.9rem;
                display: inline-flex;
                align-items: center;
                justify-content: center;
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
        `,
    ]

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
            const result = await this.client.request({
                method: 'isWalletSyncNeeded',
            })
            this.isSyncNeeded = result?.walletSyncNeeded === true
        } catch {
            this.isSyncNeeded = true
        }
    }

    syncWallets = async () => {
        if (!this.client || this.isSyncing) return

        this.isSyncing = true
        try {
            const result = await this.client.request({ method: 'syncWallets' })

            const message = `Added: ${result.added.length}, Updated: ${result.updated.length}, Disabled: ${result.disabled.length}.`

            const toast = new Toast()
            toast.title = 'Wallet Sync Complete'
            toast.message = message
            toast.type = 'success'
            document.body.appendChild(toast)

            await this.checkWalletSyncNeeded()
            this.dispatchEvent(
                new CustomEvent('sync-success', {
                    detail: {},
                    bubbles: true,
                    composed: true,
                })
            )
        } catch (error) {
            handleErrorToast(error)
        } finally {
            this.isSyncing = false
        }
    }

    protected render() {
        const title = this.isSyncing
            ? 'Syncing parties...'
            : this.isSyncNeeded
              ? 'Refresh parties (changes available)'
              : 'Refresh parties'

        return html`
            <button
                class="sync-button ${this.isSyncNeeded ? 'out-of-sync' : ''}"
                .disabled=${!this.client || this.isSyncing}
                @click=${this.syncWallets}
                title=${title}
                aria-label=${title}
            >
                <span class="sync-icon ${this.isSyncing ? 'spinning' : ''}">
                    ${refreshIcon}
                </span>
            </button>
        `
    }
}
