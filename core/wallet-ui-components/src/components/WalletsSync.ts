// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
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

    syncWallets = async () => {
        try {
            const result = await this.client?.request('syncWallets')
            alert(
                `Wallet sync completed:\n ➕ ${result?.added.length} new wallets. \n ➖ ${result?.removed.length} old wallets.`
            )
        } catch (e) {
            handleErrorToast(e)
        }
    }

    connectedCallback(): void {
        super.connectedCallback()
    }

    protected render() {
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
                    .disabled=${!this.client}
                    @click=${this.syncWallets}
                >
                    Sync Wallets
                </button>
            </div>
        `
    }
}
