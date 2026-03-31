// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html, nothing, type TemplateResult } from 'lit'
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
                padding: var(--wg-space-3);
                text-align: left;
                cursor: pointer;
                gap: var(--wg-space-3);
            }

            .activity-card:hover,
            .activity-card:focus-visible {
                outline: none;
            }

            .activity-card:active {
                transform: translateY(1px);
            }

            .field-list {
                display: flex;
                flex-direction: column;
                gap: var(--wg-space-2);
            }

            .field {
                display: grid;
                grid-template-columns: minmax(6.75rem, max-content) minmax(
                        0,
                        1fr
                    );
                align-items: center;
                column-gap: var(--wg-space-3);
                min-height: 1.75rem;
                min-width: 0;
            }

            .label {
                margin: 0;
                color: var(--wg-text-secondary);
                font-size: var(--wg-font-size-xs);
                font-weight: var(--wg-font-weight-semibold);
                line-height: 1.3;
                white-space: nowrap;
            }

            .value {
                min-width: 0;
                color: var(--wg-text);
                font-size: var(--wg-font-size-sm);
                line-height: 1.35;
                text-align: right;
                justify-self: end;
                max-width: 100%;
            }

            .truncate {
                display: block;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .status-value {
                overflow: visible;
                white-space: normal;
            }
        `,
    ]

    private renderFieldRow(
        label: string,
        value: string | TemplateResult,
        options: {
            title?: string
            truncate?: boolean
            valueClass?: string
        } = {}
    ) {
        const valueClasses = [
            'value',
            options.valueClass,
            options.truncate ? 'truncate' : '',
        ]
            .filter(Boolean)
            .join(' ')

        return html`
            <div class="field">
                <span class="label">${label}</span>
                <span class=${valueClasses} title=${options.title ?? nothing}
                    >${value}</span
                >
            </div>
        `
    }

    private handleReview() {
        if (this.loading) {
            return
        }

        this.dispatchEvent(new TransactionCardReviewEvent(this.commandId))
    }

    protected render() {
        const activityType = getActivityType(this.parsed)
        const amount = getActivityAmount(this.parsed)
        const createdAt = formatActivityDate(this.createdAt)

        return html`
            <button
                type="button"
                class="activity-card wg-card"
                @click=${this.handleReview}
                aria-label=${`Open activity ${this.commandId}`}
            >
                <div class="field-list">
                    ${this.renderFieldRow('Transaction ID', this.commandId, {
                        title: this.commandId,
                        truncate: true,
                    })}
                    ${this.renderFieldRow(
                        'Status',
                        html`
                            <span
                                class="badge rounded-pill status-badge ${getActivityStatusBadgeClass(
                                    this.status
                                )}"
                            >
                                ${getActivityStatusLabel(this.status)}
                            </span>
                        `,
                        {
                            valueClass: 'status-value',
                        }
                    )}
                    ${this.renderFieldRow('Action type', activityType, {
                        title: activityType,
                        truncate: true,
                    })}
                    ${this.renderFieldRow('Created at', createdAt, {
                        title: createdAt,
                        truncate: true,
                    })}
                    ${this.renderFieldRow('Amount', amount, {
                        title: amount,
                        truncate: true,
                    })}
                </div>
            </button>
        `
    }
}
