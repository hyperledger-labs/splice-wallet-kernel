// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, css, nothing } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element.js'
import type { ParsedTransactionInfo } from './transaction-card.js'

/** Emitted when the user clicks the "Approve" button */
export class TransactionApproveEvent extends Event {
    constructor(public commandId: string) {
        super('transaction-approve', { bubbles: true, composed: true })
    }
}

/** Emitted when the user clicks the "Delete" button */
export class TransactionDeleteEvent extends Event {
    constructor(public commandId: string) {
        super('transaction-delete', { bubbles: true, composed: true })
    }
}

@customElement('wg-transaction-detail')
export class WgTransactionDetail extends BaseElement {
    @property() commandId = ''

    @property() status = ''

    @property() txHash = ''

    @property() tx = ''

    @property({ type: Object }) parsed: ParsedTransactionInfo | null = null

    @property() createdAt: string | null = null

    @property() signedAt: string | null = null

    @property() origin: string | null = null

    @property({ type: Boolean }) isApproving = false

    @property({ type: Boolean }) isDeleting = false

    // Disables action buttons regardless of status
    @property({ type: Boolean }) disabled = false

    static styles = [
        BaseElement.styles,
        css`
            .tx-box {
                background: var(--bs-tertiary-bg, rgba(0, 0, 0, 0.05));
                border-radius: var(--bs-border-radius);
                padding: 0.5rem;
                max-height: 150px;
                overflow-y: auto;
                overflow-x: auto;
                font-family: var(--bs-font-monospace);
                word-break: break-word;
            }
        `,
    ]

    private get areActionsDisabled() {
        return this.disabled || this.isApproving || this.isDeleting
    }

    private _copyToClipboard(text: string) {
        navigator.clipboard.writeText(text)
    }

    protected render() {
        return html`
            <div class="card mt-4 overflow-hidden">
                <div class="card-body text-break">
                    <h1 class="card-title h5">Pending Transaction Request</h1>

                    <h2 class="h6 mt-3">Transaction Details</h2>

                    <h3 class="h6 mt-3">Command Id</h3>
                    <p>${this.commandId}</p>

                    <h3 class="h6 mt-3">Status</h3>
                    <p>${this.status}</p>

                    ${this.createdAt
                        ? html`<h3 class="h6 mt-3">Created At</h3>
                              <p>${this.createdAt}</p>`
                        : nothing}
                    ${this.signedAt
                        ? html`<h3 class="h6 mt-3">Signed At</h3>
                              <p>${this.signedAt}</p>`
                        : nothing}
                    ${this.origin
                        ? html`<h3 class="h6 mt-3">Origin</h3>
                              <p>${this.origin}</p>`
                        : nothing}

                    <h3 class="h6 mt-3">Template</h3>
                    <p>
                        ${this.parsed?.packageName || 'N/A'}:${this.parsed
                            ?.moduleName || 'N/A'}:${this.parsed?.entityName ||
                        'N/A'}
                    </p>

                    <h3 class="h6 mt-3">Signatories</h3>
                    <ul>
                        ${this.parsed?.signatories?.map(
                            (signatory) => html`<li>${signatory}</li>`
                        ) || html`<li>N/A</li>`}
                    </ul>

                    <h3 class="h6 mt-3">Stakeholders</h3>
                    <ul>
                        ${this.parsed?.stakeholders?.map(
                            (stakeholder) => html`<li>${stakeholder}</li>`
                        ) || html`<li>N/A</li>`}
                    </ul>

                    <h3 class="h6 mt-3">Transaction Hash</h3>
                    <p>${this.txHash}</p>

                    <div
                        class="d-flex justify-content-between align-items-center gap-2 mt-3"
                    >
                        <h3 class="h6 mb-0">Base64 Transaction</h3>
                        <button
                            class="btn btn-sm btn-outline-secondary"
                            @click=${() => this._copyToClipboard(this.tx)}
                            title="Copy to clipboard"
                        >
                            Copy
                        </button>
                    </div>
                    <div class="tx-box">${this.tx}</div>

                    <div
                        class="d-flex justify-content-between align-items-center gap-2 mt-3"
                    >
                        <h3 class="h6 mb-0">Decoded Transaction</h3>
                        <button
                            class="btn btn-sm btn-outline-secondary"
                            @click=${() =>
                                this._copyToClipboard(
                                    this.parsed?.jsonString || ''
                                )}
                            title="Copy to clipboard"
                        >
                            Copy
                        </button>
                    </div>
                    <div class="tx-box">
                        ${this.parsed?.jsonString || 'N/A'}
                    </div>

                    ${this.status !== 'pending'
                        ? nothing
                        : html`
                              <div class="d-flex gap-2 mt-3">
                                  <button
                                      class="btn btn-primary w-50"
                                      ?disabled=${this.areActionsDisabled}
                                      @click=${() =>
                                          this.dispatchEvent(
                                              new TransactionApproveEvent(
                                                  this.commandId
                                              )
                                          )}
                                  >
                                      ${this.isApproving
                                          ? html`<div
                                                class="spinner-border spinner-border-sm"
                                            ></div>`
                                          : nothing}
                                      Approve
                                  </button>
                                  <button
                                      class="btn btn-outline-danger w-50"
                                      ?disabled=${this.areActionsDisabled}
                                      @click=${() =>
                                          this.dispatchEvent(
                                              new TransactionDeleteEvent(
                                                  this.commandId
                                              )
                                          )}
                                  >
                                      ${this.isDeleting
                                          ? html`<div
                                                class="spinner-border spinner-border-sm"
                                            ></div>`
                                          : nothing}
                                      Delete
                                  </button>
                              </div>
                          `}
                </div>
            </div>
        `
    }
}
