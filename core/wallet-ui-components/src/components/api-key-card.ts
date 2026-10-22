// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { customElement, property } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element'
import { css, html } from 'lit'
import type { ApiKey } from '@canton-network/core-wallet-user-rpc-client'
import { cardStyles } from '../styles/card'

/** Emitted when the user clicks the "Revoke" button on a api key card */
export class ApiKeyCardRevokeEvent extends Event {
    constructor(public apiKey: ApiKey) {
        super('revoke', { bubbles: true, composed: true })
    }
}

@customElement('api-key-card')
export class ApiKeyCard extends BaseElement {
    @property({ type: Object }) accessor apiKey: ApiKey | null = null

    static styles = [
        BaseElement.styles,
        cardStyles,
        css`
            :host {
                display: block;
            }

            .ak-card {
                padding: var(--wg-space-3);
                cursor: pointer;
                gap: var(--wg-space-3);
                transition:
                    border-color 0.2s ease,
                    box-shadow 0.2s ease;
            }

            .ak-card:hover {
                border-color: var(--wg-accent);
                box-shadow: var(--wg-shadow-md);
            }

            .card-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
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

    render() {
        if (!this.apiKey) {
            return html`<article class="wg-card ak-card">
                No API key supplied
            </article>`
        }

        return html`
            <article class="wg-card ak-card">
                <div class="card-header">
                    <p class="card-title">${this.apiKey.name}</p>
                    <button
                        class="btn btn-danger btn-sm"
                        @click=${() =>
                            this.dispatchEvent(
                                new ApiKeyCardRevokeEvent(this.apiKey!)
                            )}
                    >
                        Revoke
                    </button>
                </div>

                <div class="meta">
                    <div class="meta-row">
                        <p class="meta-title">ID</p>
                        <p class="meta-value">${this.apiKey.id}</p>
                    </div>

                    <div class="meta-row">
                        <p class="meta-title">Created At</p>
                        <p class="meta-value">${this.apiKey.createdAt}</p>
                    </div>
                </div>
            </article>
        `
    }
}
