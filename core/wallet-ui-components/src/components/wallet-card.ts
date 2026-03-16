// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element.js'
import { PartyLevelRight, Wallet } from '@canton-network/core-wallet-store'
import { clipboardIcon } from '../icons/index.js'
import { cardStyles } from '../styles/card.js'

export class WalletSetPrimaryEvent extends Event {
    constructor(public wallet: Wallet) {
        super('wallet-set-primary', { bubbles: true, composed: true })
    }
}

export class WalletCopyPartyIdEvent extends Event {
    constructor(public partyId: string) {
        super('wallet-copy-party-id', { bubbles: true, composed: true })
    }
}

export class WalletCopyPartyHintEvent extends Event {
    constructor(public partyHint: string) {
        super('wallet-copy-party-hint', { bubbles: true, composed: true })
    }
}

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

    static styles = [
        BaseElement.styles,
        cardStyles,
        css`
            .party-card {
                padding: var(--wg-space-4);
                gap: var(--wg-space-4);
            }

            .badge {
                border-radius: var(--wg-radius-full);
                padding: 0.15rem 0.6rem;
                font-size: var(--wg-font-size-xs);
                font-weight: var(--wg-font-weight-semibold);
                letter-spacing: 0.04em;
                text-transform: uppercase;
            }

            .badge-primary {
                background: rgba(var(--wg-success-rgb), 0.14);
                color: var(--wg-success);
            }

            .badge-disabled {
                background: rgba(var(--wg-error-rgb), 0.14);
                color: var(--wg-error);
            }

            .badge-right {
                background: rgba(var(--wg-accent-rgb), 0.12);
                color: var(--wg-accent);
            }

            .rights-badges {
                display: inline-flex;
                flex-wrap: wrap;
                gap: 0.25rem;
            }

            .meta {
                display: grid;
                gap: var(--wg-space-2);
            }

            .meta-row {
                display: grid;
                grid-template-columns: auto minmax(0, 1fr) auto;
                align-items: center;
                gap: var(--wg-space-2);
                min-width: 0;
                min-height: 1.75rem;
            }

            .meta-title {
                margin: 0;
                color: var(--wg-text);
                font-size: var(--wg-font-size-sm);
                font-weight: var(--wg-font-weight-semibold);
                white-space: nowrap;
            }

            .meta-value {
                margin: 0;
                color: var(--wg-text-secondary);
                font-size: var(--wg-font-size-sm);
                min-width: 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .party-id-value {
                max-width: 250px;
            }

            .copy-btn {
                border: none;
                background: transparent;
                color: var(--wg-accent);
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 1.75rem;
                height: 1.75rem;
                border-radius: var(--wg-radius-full);
            }

            .copy-btn:hover {
                background: rgba(var(--wg-accent-rgb), 0.12);
            }

            .copy-btn:disabled {
                opacity: 0.35;
                cursor: default;
            }

            .card-actions {
                margin-top: auto;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--wg-space-2);
            }

            .link-action {
                border: none;
                background: transparent;
                padding: 0;
                color: var(--wg-accent);
                font-size: var(--wg-font-size-sm);
                font-weight: var(--wg-font-weight-medium);
                text-decoration: none;
                text-underline-offset: 2px;
            }
        `,
    ]

    private renderRightsBadges() {
        if (!this.wallet?.rights?.length) return null

        return html`
            <span class="rights-badges">
                ${this.wallet.rights.includes(PartyLevelRight.CanActAs)
                    ? html`<span class="badge badge-right">CanActAs</span>`
                    : ''}
                ${this.wallet.rights.includes(PartyLevelRight.CanReadAs)
                    ? html`<span class="badge badge-right">CanReadAs</span>`
                    : ''}
                ${this.wallet.rights.includes(PartyLevelRight.CanExecuteAs)
                    ? html`<span class="badge badge-right">CanExecuteAs</span>`
                    : ''}
            </span>
        `
    }

    private renderStatusBadge() {
        if (!this.wallet) return null

        const badge = this.wallet.primary
            ? html`<span class="badge badge-primary">Primary</span>`
            : this.wallet.disabled
              ? html`<span class="badge badge-disabled">Disabled</span>`
              : null

        return badge
    }

    private renderMeta() {
        if (!this.wallet) return null

        const excerptedPartyId =
            this.wallet.partyId.length > 24
                ? `${this.wallet.partyId.slice(0, 10)}...${this.wallet.partyId.slice(-10)}`
                : this.wallet.partyId

        return html`
            <div class="meta">
                <div class="meta-row">
                    <p class="meta-title">Party Hint:</p>
                    <p class="meta-value">${this.wallet.hint || '-'}</p>
                    <button
                        class="copy-btn"
                        type="button"
                        title="Copy party ID hint"
                        aria-label="Copy party ID hint"
                        ?disabled=${!this.wallet.hint}
                        @click=${() =>
                            this.wallet?.hint &&
                            this.dispatchEvent(
                                new WalletCopyPartyHintEvent(this.wallet.hint)
                            )}
                    >
                        ${clipboardIcon}
                    </button>
                </div>

                <div class="meta-row">
                    <p class="meta-title">Party ID:</p>
                    <p class="meta-value party-id-value">${excerptedPartyId}</p>
                    <button
                        class="copy-btn"
                        type="button"
                        title="Copy party ID"
                        aria-label="Copy party ID"
                        @click=${() =>
                            this.dispatchEvent(
                                new WalletCopyPartyIdEvent(this.wallet!.partyId)
                            )}
                    >
                        ${clipboardIcon}
                    </button>
                </div>

                <div class="meta-row">
                    <p class="meta-title">Signing Provider:</p>
                    <p class="meta-value">${this.wallet.signingProviderId}</p>
                </div>

                ${this.wallet.reason
                    ? html`
                          <div class="meta-row">
                              <p class="meta-title">Reason:</p>
                              <p class="meta-value">${this.wallet.reason}</p>
                          </div>
                      `
                    : null}

                ${this.wallet.rights?.length
                    ? html`
                          <div class="meta-row">
                              <p class="meta-title">Permissions:</p>
                              <p class="meta-value">${this.renderRightsBadges()}</p>
                          </div>
                      `
                    : null}
            </div>
        `
    }

    private renderActions() {
        if (!this.wallet) return null

        const badge = this.renderStatusBadge()

        if (this.verified) {
            if (this.wallet.primary) {
                if (!badge) return null

                return html` <div class="card-actions">${badge}</div> `
            }

            return html`
                <div class="card-actions">
                    ${badge}
                    <button
                        type="button"
                        class="link-action"
                        ?disabled=${this.loading || this.wallet.disabled}
                        @click=${() =>
                            this.dispatchEvent(
                                new WalletSetPrimaryEvent(this.wallet!)
                            )}
                    >
                        Set as primary
                    </button>
                </div>
            `
        }

        return html`
            <div class="card-actions">
                ${badge}
                <button
                    class="btn btn-outline-secondary btn-sm"
                    ?disabled=${this.loading || this.wallet.disabled}
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
        this.syncPartyIdAttribute()
    }

    override updated() {
        this.syncPartyIdAttribute()
    }

    private syncPartyIdAttribute() {
        if (this.wallet?.partyId) {
            this.setAttribute('party-id', this.wallet.partyId)
        } else {
            this.removeAttribute('party-id')
        }
    }

    protected render() {
        if (!this.wallet) {
            return html`<article class="wg-card party-card">
                No party supplied
            </article>`
        }

        return html`
            <article class="wg-card party-card">
                ${this.renderMeta()} ${this.renderActions()}
            </article>
        `
    }
}
