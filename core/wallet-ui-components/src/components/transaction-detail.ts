// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, css, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element.js'
import type { ParsedTransactionInfo } from '@canton-network/core-tx-visualizer'
import { chevronDownIcon, chevronLeftIcon } from '../icons/index.js'
import {
    formatActivityDate,
    getActivityAmount,
    getActivityStatusBadgeClass,
    getActivityStatusLabel,
    getActivityType,
} from '../internal/activity-utils.js'

/** Emitted when the user clicks the "Approve" button */
export class TransactionApproveEvent extends Event {
    constructor(public commandId: string) {
        super('transaction-approve', { bubbles: true, composed: true })
    }
}

/** Emitted when the user clicks the "Reject" button */
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

    @property() backHref = ''

    @property({ type: Boolean }) isApproving = false

    @property({ type: Boolean }) isDeleting = false

    // Disables action buttons regardless of status
    @property({ type: Boolean }) disabled = false

    @state() private decodedExpanded = false

    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: block;
                max-width: 900px;
                margin: 0 auto;
            }

            .page-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--wg-space-3);
                margin-bottom: var(--wg-space-4);
            }

            .page-title {
                color: var(--wg-text);
            }

            .back-link {
                display: inline-flex;
                align-items: center;
                gap: var(--wg-space-1);
            }

            .back-link .icon {
                display: inline-flex;
                align-items: center;
            }

            .detail-grid {
                display: flex;
                flex-direction: column;
                gap: var(--wg-space-4);
            }

            .field {
                display: flex;
                flex-direction: column;
                gap: var(--wg-space-1);
                min-width: 0;
            }

            .field--stacked {
                gap: var(--wg-space-2);
            }

            .field-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--wg-space-3);
                min-width: 0;
            }

            .detail-row {
                display: grid;
                grid-template-columns: minmax(0, 8.5rem) minmax(0, 1fr);
                align-items: center;
                gap: var(--wg-space-3);
                min-width: 0;
            }

            .label {
                margin: 0;
                color: var(--wg-text-secondary);
                font-size: var(--wg-font-size-xs);
                font-weight: var(--wg-font-weight-semibold);
                line-height: 1.4;
            }

            .value {
                margin: 0;
                color: var(--wg-text);
                font-size: var(--wg-font-size-sm);
                line-height: 1.5;
                min-width: 0;
                word-break: break-word;
                text-align: right;
            }

            .detail-value {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: var(--wg-space-2);
                min-width: 0;
            }

            .copyable-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--wg-space-2);
                min-width: 0;
            }

            .detail-value .value,
            .copyable-row wg-copy-button,
            .field-header wg-copy-button {
                flex: 0 0 auto;
            }

            .detail-value .value,
            .copyable-row .value {
                flex: 1;
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                word-break: normal;
            }

            .field--stacked .value,
            .decoded-box {
                text-align: left;
            }

            .signatory-list {
                list-style: none;
                padding: 0;
                margin: 0;
                display: flex;
                flex-direction: column;
                gap: var(--wg-space-2);
                min-width: 0;
            }

            .detail-row--top {
                align-items: start;
            }

            .detail-row--top > .label {
                padding-top: 0.45rem;
            }

            .detail-value--stacked {
                flex-direction: column;
                align-items: stretch;
                justify-content: flex-start;
            }

            .detail-value--stacked .copyable-row {
                width: 100%;
            }

            .toggle-btn {
                flex: 1;
                min-width: 0;
                padding: 0;
                border: none;
                background: transparent;
                color: inherit;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--wg-space-3);
                cursor: pointer;
                text-align: left;
            }

            .toggle-icon {
                display: inline-flex;
                align-items: center;
                color: var(--wg-text);
                transition: transform 0.2s ease;
            }

            .toggle-icon.open {
                transform: rotate(180deg);
            }

            .decoded-box {
                margin-top: var(--wg-space-2);
                margin-bottom: 0;
                padding: var(--wg-space-4);
                border: 1px solid var(--wg-border);
                border-radius: var(--wg-radius-lg);
                background: var(--wg-input-bg);
                color: var(--wg-text);
                font-family: var(--bs-font-monospace);
                white-space: pre-wrap;
                word-break: break-word;
                max-height: 20rem;
                overflow: auto;
            }

            .actions {
                margin-top: var(--wg-space-6);
                display: flex;
                gap: var(--wg-space-3);
                justify-content: flex-start;
                flex-wrap: nowrap;
            }

            .actions .btn {
                flex: 1 1 0;
                min-width: 0;
                white-space: nowrap;
            }

            .actions .btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
        `,
    ]

    private get isApproveDisabled() {
        return this.disabled || this.isApproving || this.isDeleting
    }

    private get isDeleteDisabled() {
        return this.disabled || this.isApproving || this.isDeleting
    }

    private toggleDecoded() {
        this.decodedExpanded = !this.decodedExpanded
    }

    private renderCopyableValue(
        label: string,
        value: string | null | undefined,
        copyLabel: string
    ) {
        const resolvedValue = value || 'N/A'

        return html`
            <section class="field">
                <div class="detail-row">
                    <h2
                        class="label small fw-semibold text-body-secondary mb-0"
                    >
                        ${label}
                    </h2>
                    <div class="detail-value">
                        <p class="value mb-0 text-body">${resolvedValue}</p>
                        ${value
                            ? html`
                                  <wg-copy-button
                                      .value=${value}
                                      .label=${copyLabel}
                                  ></wg-copy-button>
                              `
                            : nothing}
                    </div>
                </div>
            </section>
        `
    }

    private renderInlineField(label: string, value: unknown) {
        return html`
            <section class="field">
                <div class="detail-row">
                    <h2
                        class="label small fw-semibold text-body-secondary mb-0"
                    >
                        ${label}
                    </h2>
                    <div class="detail-value">
                        <p class="value mb-0 text-body">${value}</p>
                    </div>
                </div>
            </section>
        `
    }

    private renderSignatories() {
        const signatories = this.parsed?.signatories || []

        return html`
            <section class="field">
                <div class="detail-row detail-row--top">
                    <h2
                        class="label small fw-semibold text-body-secondary mb-0"
                    >
                        Signatories
                    </h2>
                    <div class="detail-value detail-value--stacked">
                        ${signatories.length
                            ? html`
                                  <ul class="signatory-list">
                                      ${signatories.map(
                                          (signatory) => html`
                                              <li class="copyable-row">
                                                  <p
                                                      class="value mb-0 text-body"
                                                  >
                                                      ${signatory}
                                                  </p>
                                                  <wg-copy-button
                                                      .value=${signatory}
                                                      label="Copy signatory"
                                                  ></wg-copy-button>
                                              </li>
                                          `
                                      )}
                                  </ul>
                              `
                            : html`<p class="value mb-0 text-body">N/A</p>`}
                    </div>
                </div>
            </section>
        `
    }

    private renderDecodedBox(decoded: string) {
        return html`<pre class="decoded-box small mb-0">${decoded}</pre>`
    }

    protected render() {
        const activityType = getActivityType(this.parsed)
        const amount = getActivityAmount(this.parsed)
        const decoded = this.parsed?.jsonString || 'N/A'

        return html`
            <div class="page-header">
                <h1 class="page-title h4 fw-semibold mb-0">Activity Details</h1>
                ${this.backHref
                    ? html`
                          <a
                              class="back-link btn btn-link btn-sm text-body text-decoration-none p-0"
                              href=${this.backHref}
                          >
                              <span class="icon">${chevronLeftIcon}</span>
                              <span>Back</span>
                          </a>
                      `
                    : nothing}
            </div>

            <div class="detail-grid">
                ${this.renderInlineField(
                    'Status',
                    html`<span
                        class="badge rounded-pill small ${getActivityStatusBadgeClass(
                            this.status
                        )}"
                    >
                        ${getActivityStatusLabel(this.status)}
                    </span>`
                )}
                ${this.renderInlineField('Action type', activityType)}
                ${this.renderInlineField(
                    'Created at',
                    formatActivityDate(this.createdAt)
                )}
                ${this.renderInlineField('Amount', amount)}
                ${this.renderSignatories()}
                ${this.renderCopyableValue(
                    'Template',
                    this.parsed?.templateId || null,
                    'Copy template'
                )}
                ${this.renderCopyableValue(
                    'Transaction ID',
                    this.commandId,
                    'Copy transaction ID'
                )}
                ${this.renderCopyableValue(
                    'Transaction hash',
                    this.txHash,
                    'Copy transaction hash'
                )}

                <section class="field field--stacked">
                    <div class="field-header">
                        <button
                            type="button"
                            class="toggle-btn"
                            @click=${this.toggleDecoded}
                            aria-expanded=${this.decodedExpanded}
                        >
                            <h2
                                class="label small fw-semibold text-body-secondary mb-0"
                            >
                                Decoded hash
                            </h2>
                            <span
                                class="toggle-icon ${this.decodedExpanded
                                    ? 'open'
                                    : ''}"
                            >
                                ${chevronDownIcon}
                            </span>
                        </button>
                        ${this.parsed?.jsonString
                            ? html`
                                  <wg-copy-button
                                      .value=${this.parsed.jsonString}
                                      label="Copy decoded hash"
                                  ></wg-copy-button>
                              `
                            : nothing}
                    </div>
                    ${this.decodedExpanded
                        ? this.renderDecodedBox(decoded)
                        : nothing}
                </section>
            </div>

            ${this.renderActionButtons()}
        `
    }

    private renderActionButtons() {
        if (this.status !== 'pending' && this.status !== 'signed') {
            return nothing
        }

        return html`
            <div class="actions">
                ${this.status === 'pending'
                    ? html`
                          <button
                              class="btn btn-outline-danger rounded-pill d-inline-flex align-items-center justify-content-center gap-2"
                              ?disabled=${this.isDeleteDisabled}
                              @click=${() =>
                                  this.dispatchEvent(
                                      new TransactionDeleteEvent(this.commandId)
                                  )}
                          >
                              ${this.isDeleting
                                  ? html`<div
                                        class="spinner-border spinner-border-sm"
                                    ></div>`
                                  : nothing}
                              Reject
                          </button>
                      `
                    : nothing}

                <button
                    class="btn btn-primary rounded-pill d-inline-flex align-items-center justify-content-center gap-2"
                    ?disabled=${this.isApproveDisabled}
                    @click=${() =>
                        this.dispatchEvent(
                            new TransactionApproveEvent(this.commandId)
                        )}
                >
                    ${this.isApproving
                        ? html`<div
                              class="spinner-border spinner-border-sm"
                          ></div>`
                        : nothing}
                    Approve
                </button>
            </div>
        `
    }
}
