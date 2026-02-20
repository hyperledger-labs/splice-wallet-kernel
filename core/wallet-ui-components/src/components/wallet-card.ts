// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element.js'
import { Wallet } from '@canton-network/core-wallet-store'
import { cardStyles } from '../styles/card.js'

/** Emitted when the user clicks "Set Primary" on a wallet card */
export class WalletSetPrimaryEvent extends Event {
    constructor(public wallet: Wallet) {
        super('wallet-set-primary', { bubbles: true, composed: true })
    }
}

/** Emitted when the user clicks "Copy Party ID" on a wallet card */
export class WalletCopyPartyIdEvent extends Event {
    constructor(public partyId: string) {
        super('wallet-copy-party-id', { bubbles: true, composed: true })
    }
}

/** Emitted when the user clicks "Allocate party" on an unverified wallet card */
export class WalletAllocateEvent extends Event {
    constructor(public wallet: Wallet) {
        super('wallet-allocate', { bubbles: true, composed: true })
    }
}

@customElement('wg-wallet-card')
export class WgWalletCard extends BaseElement {
    @property({ type: Object }) wallet: Wallet | null = null

    @property({ type: Boolean }) verified = false

    @property({ type: Boolean }) loading = false

    static styles = [BaseElement.styles, cardStyles]

    private _renderWalletInfo() {
        if (!this.wallet) return html`<p>No wallet supplied</p>`

        return html`
            <h5 class="card-title text-primary fw-semibold text-break">
                ${this.wallet.hint || this.wallet.partyId}
                ${this.wallet.primary
                    ? html`<span class="text-success">(Primary)</span>`
                    : ''}
                ${this.wallet.disabled
                    ? html`<span class="text-danger">(Disabled)</span>`
                    : ''}
            </h5>
            <p class="card-text text-muted text-break">
                <strong>Party ID:</strong> ${this.wallet.partyId}<br />
                <strong>Network:</strong> ${this.wallet.networkId}<br />
                <strong>Signing Provider:</strong>
                ${this.wallet.signingProviderId}
                ${this.wallet.disabled
                    ? html`<br /><strong>Disabled:</strong> Yes`
                    : ''}
                ${this.wallet.reason
                    ? html`<br /><strong>Reason:</strong> ${this.wallet.reason}`
                    : ''}
            </p>
        `
    }

    private _renderActions() {
        if (!this.wallet) return ''

        if (this.verified) {
            return html`
                <div class="d-flex gap-2 mt-2">
                    <button
                        class="btn btn-sm btn-outline-secondary"
                        ?disabled=${this.wallet.disabled}
                        @click=${() =>
                            this.dispatchEvent(
                                new WalletSetPrimaryEvent(this.wallet!)
                            )}
                    >
                        Set Primary
                    </button>
                    <button
                        class="btn btn-sm btn-outline-secondary"
                        @click=${() =>
                            this.dispatchEvent(
                                new WalletCopyPartyIdEvent(this.wallet!.partyId)
                            )}
                    >
                        Copy Party ID
                    </button>
                </div>
            `
        }

        return html`
            <div class="d-flex gap-2 mt-2">
                <button
                    class="btn btn-sm btn-outline-secondary"
                    ?disabled=${this.loading}
                    @click=${() =>
                        this.dispatchEvent(
                            new WalletAllocateEvent(this.wallet!)
                        )}
                >
                    Allocate party
                </button>
            </div>
        `
    }

    override connectedCallback() {
        super.connectedCallback()
        this._syncPartyIdAttribute()
    }

    override updated() {
        this._syncPartyIdAttribute()
    }

    /** Reflect the wallet's party ID as a DOM attribute for easy querying. */
    private _syncPartyIdAttribute() {
        if (this.wallet?.partyId) {
            this.setAttribute('party-id', this.wallet.partyId)
        } else {
            this.removeAttribute('party-id')
        }
    }

    protected render() {
        return html`
            <div class="card shadow-sm">
                <div class="card-body">
                    ${this._renderWalletInfo()} ${this._renderActions()}
                </div>
            </div>
        `
    }
}
