// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element.js'
import { PartyLevelRight, Wallet } from '@canton-network/core-wallet-store'
import { cardStyles } from '../styles/card.js'

export class WalletSetPrimaryEvent extends Event {
    constructor(public wallet: Wallet) {
        super('wallet-set-primary', { bubbles: true, composed: true })
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
                padding: var(--wg-space-3);
                gap: var(--wg-space-3);
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
                gap: 0.375rem;
            }

            .meta-row {
                display: grid;
                grid-template-columns: minmax(5.5rem, 6rem) minmax(0, 1fr);
                align-items: center;
                column-gap: 0.625rem;
                min-width: 0;
            }

            .meta-row--copy {
                grid-template-columns:
                    minmax(5.5rem, 6rem) minmax(0, 1fr)
                    1.75rem;
            }

            .meta-row--stacked {
                grid-template-columns: minmax(0, 1fr);
                align-items: start;
            }

            .meta-row wg-copy-button {
                justify-self: end;
                align-self: center;
            }

            .meta-title {
                margin: 0;
                color: var(--wg-text-secondary);
                font-size: var(--wg-font-size-xs);
                font-weight: var(--wg-font-weight-semibold);
                line-height: 1.3;
                white-space: nowrap;
            }

            .meta-value {
                margin: 0;
                color: var(--wg-text);
                font-size: var(--wg-font-size-sm);
                min-width: 0;
                width: 100%;
                overflow: hidden;
                text-overflow: ellipsis;
                line-height: 1.35;
                text-align: right;
                white-space: nowrap;
            }

            .party-id-value {
                max-width: min(15rem, 100%);
            }

            .meta-value-wrap {
                overflow: visible;
                text-overflow: unset;
                white-space: normal;
                text-align: left;
            }

            .card-actions {
                margin-top: var(--wg-space-1);
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 0.375rem;
            }

            .link-action {
                border: none;
                background: transparent;
                padding: 0;
                color: var(--wg-accent);
                font-size: var(--wg-font-size-sm);
                font-weight: var(--wg-font-weight-medium);
                line-height: 1.2;
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
        const shouldStackReason = Boolean(
            this.wallet.reason &&
            (this.wallet.reason.length > 72 ||
                this.wallet.reason.includes('\n'))
        )

        return html`
            <div class="meta">
                <div
                    class=${this.wallet.hint
                        ? 'meta-row meta-row--copy'
                        : 'meta-row'}
                >
                    <p class="meta-title">Party hint</p>
                    <p class="meta-value" title=${this.wallet.hint || '-'}>
                        ${this.wallet.hint || '-'}
                    </p>
                    ${this.wallet.hint
                        ? html`
                              <wg-copy-button
                                  .value=${this.wallet.hint}
                                  label="Copy party hint"
                              ></wg-copy-button>
                          `
                        : null}
                </div>

                <div class="meta-row meta-row--copy">
                    <p class="meta-title">Party ID</p>
                    <p
                        class="meta-value party-id-value"
                        title=${this.wallet.partyId}
                    >
                        ${excerptedPartyId}
                    </p>
                    <wg-copy-button
                        .value=${this.wallet.partyId}
                        label="Copy party ID"
                    ></wg-copy-button>
                </div>

                <div class="meta-row">
                    <p class="meta-title">Signing provider</p>
                    <p
                        class="meta-value"
                        title=${this.wallet.signingProviderId}
                    >
                        ${this.wallet.signingProviderId}
                    </p>
                </div>

                ${this.wallet.reason
                    ? html`
                          <div
                              class=${shouldStackReason
                                  ? 'meta-row meta-row--stacked'
                                  : 'meta-row'}
                          >
                              <p class="meta-title">Reason</p>
                              <p
                                  class=${shouldStackReason
                                      ? 'meta-value meta-value-wrap'
                                      : 'meta-value'}
                                  title=${this.wallet.reason}
                              >
                                  ${this.wallet.reason}
                              </p>
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
                    class="btn btn-outline-secondary btn-sm rounded-pill"
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
