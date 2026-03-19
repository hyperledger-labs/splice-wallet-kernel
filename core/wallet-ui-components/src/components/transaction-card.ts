// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element.js'
import { cardStyles } from '../styles/card.js'
import { ParsedTransactionInfo } from '@canton-network/core-tx-visualizer'
import {
    formatActivityDate,
    getActivityAmount,
    getActivityStatusBadgeClass,
    getActivityStatusLabel,
    getActivityType,
} from '../internal/activity-utils.js'

/** Emitted when the user clicks an activity card */
export class TransactionCardReviewEvent extends Event {
    constructor(public commandId: string) {
        super('transaction-review', { bubbles: true, composed: true })
    }
}

@customElement('wg-transaction-card')
export class WgTransactionCard extends BaseElement {
    @property() commandId = ''

    @property() status = ''

    @property({ type: Object }) parsed: ParsedTransactionInfo | null = null

    @property() createdAt: string | null = null

    @property() signedAt: string | null = null

    @property() origin: string | null = null

    @property() loading = false

    static styles = [
        BaseElement.styles,
        cardStyles,
        css`
            .activity-card {
                width: 100%;
                border: 1px solid var(--wg-border);
                border-radius: var(--wg-radius-lg);
                background: var(--wg-surface);
                padding: var(--wg-space-4);
                text-align: left;
                cursor: pointer;
            }

            .activity-card:hover,
            .activity-card:focus-visible {
                background: var(--wg-surface-hover);
                border-color: var(--wg-accent);
                box-shadow: var(--wg-shadow-md);
                outline: none;
            }

            .activity-card:active {
                transform: translateY(1px);
            }

            .field-list {
                display: flex;
                flex-direction: column;
                gap: var(--wg-space-3);
            }

            .field {
                display: grid;
                grid-template-columns: auto 1fr;
                gap: var(--wg-space-1);
                align-items: baseline;
                min-width: 0;
                font-size: var(--wg-font-size-base);
            }

            .label {
                font-weight: var(--wg-font-weight-bold);
                color: var(--wg-text);
            }

            .value {
                min-width: 0;
                color: var(--wg-text);
            }

            .truncate {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
        `,
    ]

    private handleReview() {
        if (this.loading) {
            return
        }

        this.dispatchEvent(new TransactionCardReviewEvent(this.commandId))
    }

    protected render() {
        const activityType = getActivityType(this.parsed)
        const amount = getActivityAmount(this.parsed)

        return html`
            <button
                type="button"
                class="activity-card"
                @click=${this.handleReview}
                aria-label=${`Open activity ${this.commandId}`}
            >
                <div class="field-list">
                    <div class="field">
                        <span class="label">Transaction ID:</span>
                        <span class="value truncate" title=${this.commandId}
                            >${this.commandId}</span
                        >
                    </div>

                    <div class="field">
                        <span class="label">Status:</span>
                        <span class="value">
                            <span
                                class="badge rounded-pill status-badge ${getActivityStatusBadgeClass(
                                    this.status
                                )}"
                            >
                                ${getActivityStatusLabel(this.status)}
                            </span>
                        </span>
                    </div>

                    <div class="field">
                        <span class="label">Type:</span>
                        <span class="value">${activityType}</span>
                    </div>

                    <div class="field">
                        <span class="label">Created At:</span>
                        <span class="value"
                            >${formatActivityDate(this.createdAt)}</span
                        >
                    </div>

                    <div class="field">
                        <span class="label">Amount:</span>
                        <span class="value">${amount}</span>
                    </div>
                </div>
            </button>
        `
    }
}
