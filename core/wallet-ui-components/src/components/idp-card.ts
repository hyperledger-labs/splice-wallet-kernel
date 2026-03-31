// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { customElement, property } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element'
import { css, html } from 'lit'
import { Idp } from '@canton-network/core-wallet-user-rpc-client'
import { cardStyles } from '../styles/card'

/** Emitted when the user clicks an IDP card to review it */
export class IdpCardReviewEvent extends Event {
    constructor(public idp: Idp) {
        super('idp-review', { bubbles: true, composed: true })
    }
}

/** Emitted when the user clicks the "Delete" button on an IDP card */
export class IdpCardDeleteEvent extends Event {
    constructor(public idp: Idp) {
        super('delete', { bubbles: true, composed: true })
    }
}

/** Emitted when the user clicks the "Update" button on an IDP card */
export class IdpCardUpdateEvent extends Event {
    constructor() {
        super('update', { bubbles: true, composed: true })
    }
}

@customElement('idp-card')
export class IdpCard extends BaseElement {
    @property({ type: Object }) idp: Idp | null = null
    @property({ type: Boolean }) readonly = false

    static styles = [
        BaseElement.styles,
        cardStyles,
        css`
            :host {
                display: block;
            }

            .idp-card {
                padding: var(--wg-space-3);
                cursor: pointer;
                gap: var(--wg-space-3);
            }

            .idp-card:hover {
                border-color: var(--wg-accent);
                box-shadow: var(--wg-shadow-md);
            }

            .card-title {
                margin: 0;
                font-size: var(--wg-font-size-base);
                font-weight: var(--wg-font-weight-bold);
                color: var(--wg-text);
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
        `,
    ]

    private _onClick() {
        if (this.idp) {
            this.dispatchEvent(new IdpCardReviewEvent(this.idp))
        }
    }

    render() {
        if (!this.idp) {
            return html`<article class="wg-card idp-card">
                No identity provider supplied
            </article>`
        }

        return html`
            <article class="wg-card idp-card" @click=${this._onClick}>
                <p class="card-title">${this.idp.id}</p>

                <div class="meta">
                    <div class="meta-row">
                        <p class="meta-title">Type</p>
                        <p class="meta-value">${this.idp.type}</p>
                    </div>

                    <div class="meta-row meta-row--copy">
                        <p class="meta-title">Issuer</p>
                        <p class="meta-value" title=${this.idp.issuer}>
                            ${this.idp.issuer}
                        </p>
                        <wg-copy-button
                            .value=${this.idp.issuer}
                            label="Copy issuer URL"
                        ></wg-copy-button>
                    </div>

                    ${'configUrl' in this.idp && this.idp.configUrl
                        ? html`
                              <div class="meta-row meta-row--copy">
                                  <p class="meta-title">Config URL</p>
                                  <p
                                      class="meta-value"
                                      title=${this.idp.configUrl}
                                  >
                                      ${this.idp.configUrl}
                                  </p>
                                  <wg-copy-button
                                      .value=${this.idp.configUrl}
                                      label="Copy config URL"
                                  ></wg-copy-button>
                              </div>
                          `
                        : ''}
                </div>
            </article>
        `
    }
}
