// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element'
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

            let message = `Wallet sync completed:\n`
            message += ` ➕ ${added.length} new wallet${added.length !== 1 ? 's' : ''}.\n`
            if (disabledAdded.length > 0) {
                message += `⚠️ Of which ${disabledAdded.length} ${disabledAdded.length === 1 ? 'is' : 'are'} disabled.\n`
            }
            message += ` ➖ ${removed.length} old wallet${removed.length !== 1 ? 's' : ''}.`

            alert(message)
            // Re-check if sync is needed after sync
            await this.checkWalletSyncNeeded()
        } catch (e) {
            handleErrorToast(e)
        } finally {
            this.isSyncing = false
        }
    }

    protected render() {
        return html`
            <div class="mb-5">
                <div class="header"><h1>Wallets</h1></div>
                ${this.isSyncNeeded
                    ? html`
                          <div
                              class="alert alert-primary d-flex align-items-center py-2"
                              role="alert"
                          >
                              <span class="icon me-2"
                                  >${infoCircleFillIcon}</span
                              >
                              Keep your wallets in sync with the connected
                              network.
                          </div>
                      `
                    : html`
                          <div
                              class="alert alert-success d-flex align-items-center py-2"
                              role="alert"
                          >
                              <span class="icon me-2"
                                  >${infoCircleFillIcon}</span
                              >
                              Wallets are in sync with the connected network.
                          </div>
                      `}
                <button
                    class="btn btn-primary"
                    .disabled=${!this.client ||
                    this.isSyncing ||
                    !this.isSyncNeeded}
                    @click=${this.syncWallets}
                >
                    ${this.isSyncing ? 'Syncing Wallets...' : 'Sync Wallets'}
                </button>
            </div>
        `
    }
}
