// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Wallet } from '@canton-network/core-wallet-user-rpc-client'
import { css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { isWalletEditable, partitionWallets } from '../logic/parties.js'
import { BaseElement } from '../internal/base-element.js'
import './wallet-card.js'

/**
 * The grid of party cards: wallets that still need to be allocated first, then
 * the allocated ones. The cards' `wallet-allocate`, `wallet-edit` and
 * `wallet-set-primary` events bubble out of this element.
 */
@customElement('wg-wallet-list')
export class WgWalletList extends BaseElement {
    /** The wallets to show. While it is undefined, a loading text is shown */
    @property({ type: Array }) wallets: Wallet[] | undefined = undefined
    /** Disables the cards' actions, e.g. while a request is in flight */
    @property({ type: Boolean }) loading = false
    /** Wallets of this signing provider can't be edited */
    @property() nonEditableSigningProviderId = ''

    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: block;
            }
        `,
    ]

    render() {
        const { verifiedWallets, unverifiedWallets } = partitionWallets(
            this.wallets
        )

        return html`
            ${
                this.wallets === undefined
                    ? html`<p class="text-body-secondary mb-3">
                          Loading parties...
                      </p>`
                    : ''
            }

            <div class="row g-3 my-1">
                ${unverifiedWallets.map(
                    (wallet) => html`
                        <div class="col-md-6 col-lg-4">
                            <wg-wallet-card
                                .wallet=${wallet}
                                ?loading=${this.loading}
                            ></wg-wallet-card>
                        </div>
                    `
                )}
            </div>

            <div class="row g-3 my-1">
                ${verifiedWallets.map(
                    (wallet) => html`
                        <div class="col-md-6 col-lg-4">
                            <wg-wallet-card
                                .wallet=${wallet}
                                verified
                                .editable=${isWalletEditable(
                                    wallet,
                                    this.nonEditableSigningProviderId
                                )}
                                ?loading=${this.loading}
                            ></wg-wallet-card>
                        </div>
                    `
                )}
            </div>
        `
    }
}
