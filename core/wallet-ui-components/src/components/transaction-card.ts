// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, nothing } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element.js'
import { cardStyles } from '../styles/card.js'

/** Parsed transaction metadata for display purposes */
export interface ParsedTransactionInfo {
    packageName?: string
    moduleName?: string
    entityName?: string
    signatories?: string[]
    stakeholders?: string[]
    jsonString?: string
}

/** Emitted when the user clicks "Review" on a transaction card */
export class TransactionReviewEvent extends Event {
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

    static styles = [BaseElement.styles, cardStyles]

    protected render() {
        return html`
            <div class="card shadow-sm">
                <div class="card-body">
                    <h5 class="card-title text-primary fw-semibold text-break">
                        ${this.commandId}
                    </h5>
                    <p class="card-text text-muted text-break">
                        <strong>Status:</strong>
                        <span class="text-success"> ${this.status} </span>
                        <br />
                        <strong>Template:</strong>
                        ${this.parsed?.packageName || 'N/A'}:${this.parsed
                            ?.moduleName || 'N/A'}:${this.parsed?.entityName ||
                        'N/A'}
                        <br />
                        <strong>Signatories:</strong>
                    </p>
                    <ul>
                        ${this.parsed?.signatories?.map(
                            (signatory) => html`<li>${signatory}</li>`
                        ) || html`<li>N/A</li>`}
                    </ul>
                    <p class="card-text text-muted text-break">
                        ${this.createdAt
                            ? html`<strong>Created At:</strong> ${this
                                      .createdAt}<br />`
                            : nothing}
                        ${this.signedAt
                            ? html`<strong>Signed At:</strong> ${this
                                      .signedAt}<br />`
                            : nothing}
                        ${this.origin
                            ? html`<strong>Origin:</strong> ${this.origin}`
                            : nothing}
                    </p>
                    <div class="d-flex gap-2 mt-2">
                        <button
                            class="btn btn-sm btn-outline-secondary"
                            @click=${() =>
                                this.dispatchEvent(
                                    new TransactionReviewEvent(this.commandId)
                                )}
                        >
                            Review
                        </button>
                    </div>
                </div>
            </div>
        `
    }
}
