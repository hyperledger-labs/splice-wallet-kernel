// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { customElement, property } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element'
import { css, html } from 'lit'
import { Network } from '@canton-network/core-wallet-store'
import { cardStyles } from '../styles/card'

/** Emitted when the user clicks a network card to review it */
export class NetworkCardReviewEvent extends Event {
    constructor(public network: Network) {
        super('network-review', { bubbles: true, composed: true })
    }
}

/** Emitted when the user clicks the "Delete" button on a network card */
export class NetworkCardDeleteEvent extends Event {
    constructor(public network: Network) {
        super('delete', { bubbles: true, composed: true })
    }
}

/** Emitted when the user clicks the "Update" button on a network card */
export class NetworkCardUpdateEvent extends Event {
    constructor() {
        super('update', { bubbles: true, composed: true })
    }
}

@customElement('network-card')
export class NetworkCard extends BaseElement {
    @property({ type: Object }) network: Network | null = null
    @property({ type: Boolean }) activeSession = false
    @property({ type: String }) accessToken = ''
    @property({ type: Boolean }) readonly = false

    static styles = [
        BaseElement.styles,
        cardStyles,
        css`
            :host {
                display: block;
            }

            .net-card {
                padding: var(--wg-space-3);
                cursor: pointer;
                gap: var(--wg-space-3);
                transition:
                    border-color 0.2s ease,
                    box-shadow 0.2s ease;
            }

            .net-card:hover {
                border-color: var(--wg-accent);
                box-shadow: var(--wg-shadow-md);
            }

            .card-header {
                display: flex;
                align-items: center;
                gap: var(--wg-space-2);
            }

            .card-title {
                margin: 0;
                font-size: var(--wg-font-size-base);
                font-weight: var(--wg-font-weight-bold);
                color: var(--wg-text);
            }

            .badge-connected {
                display: inline-flex;
                align-items: center;
                border-radius: var(--wg-radius-full);
                padding: 0.15rem 0.55rem;
                font-size: var(--wg-font-size-xs);
                font-weight: var(--wg-font-weight-semibold);
                letter-spacing: 0.04em;
                background: rgba(var(--wg-success-rgb), 0.14);
                color: var(--wg-success);
            }

            .meta {
                display: grid;
                gap: var(--wg-space-2);
            }

            .meta-row {
                display: grid;
                grid-template-columns:
                    minmax(5.5rem, 6rem) minmax(0, 1fr)
                    1.75rem;
                align-items: center;
                column-gap: 0.625rem;
                min-height: 1.75rem;
                min-width: 0;
            }

            .meta-row--copy {
                grid-template-columns:
                    minmax(5.5rem, 6rem) minmax(0, 1fr)
                    1.75rem;
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

            .meta-value-muted {
                color: var(--wg-text-secondary);
            }
        `,
    ]

    private _onClick() {
        if (this.network) {
            this.dispatchEvent(new NetworkCardReviewEvent(this.network))
        }
    }

    render() {
        if (!this.network) {
            return html`<article class="wg-card net-card">
                No network supplied
            </article>`
        }

        const syncId = this.network.synchronizerId || ''

        return html`
            <article class="wg-card net-card" @click=${this._onClick}>
                <div class="card-header">
                    <p class="card-title">${this.network.name}</p>
                    ${this.activeSession
                        ? html`<span class="badge-connected">CONNECTED</span>`
                        : ''}
                </div>

                <div class="meta">
                    <div class="meta-row">
                        <p class="meta-title">ID</p>
                        <p class="meta-value">${this.network.id}</p>
                    </div>

                    ${this.activeSession
                        ? html`
                              <div class="meta-row meta-row--copy">
                                  <p class="meta-title">Access Token</p>
                                  <p class="meta-value meta-value-muted">
                                      [private]
                                  </p>
                                  <wg-copy-button
                                      .value=${this.accessToken}
                                      label="Copy access token"
                                  ></wg-copy-button>
                              </div>
                          `
                        : ''}

                    <div class="meta-row">
                        <p class="meta-title">Auth</p>
                        <p class="meta-value">${this.network.auth.method}</p>
                    </div>

                    ${syncId
                        ? html`
                              <div class="meta-row meta-row--copy">
                                  <p class="meta-title">Synchronizer</p>
                                  <p class="meta-value" title=${syncId}>
                                      ${syncId}
                                  </p>
                                  <wg-copy-button
                                      .value=${syncId}
                                      label="Copy synchronizer ID"
                                  ></wg-copy-button>
                              </div>
                          `
                        : ''}
                    ${this.network.identityProviderId
                        ? html`
                              <div class="meta-row">
                                  <p class="meta-title">Identity provider</p>
                                  <p
                                      class="meta-value"
                                      title=${this.network.identityProviderId}
                                  >
                                      ${this.network.identityProviderId}
                                  </p>
                              </div>
                          `
                        : ''}
                </div>
            </article>
        `
    }
}
