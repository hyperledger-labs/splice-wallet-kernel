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
                margin-bottom: var(--wg-space-5);
            }

            .page-title {
                margin: 0;
                font-size: clamp(1.5rem, 3vw, 1.875rem);
                font-weight: 800;
                line-height: var(--wg-line-height-tight);
                color: var(--wg-text);
            }

            .back-link {
                color: var(--wg-text);
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                gap: var(--wg-space-1);
                font-size: var(--wg-font-size-base);
                font-weight: var(--wg-font-weight-medium);
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

            .field-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--wg-space-3);
                min-width: 0;
            }

            .label {
                margin: 0;
                font-size: var(--wg-font-size-base);
                font-weight: var(--wg-font-weight-bold);
                line-height: var(--wg-line-height-tight);
            }

            .value {
                margin: 0;
                color: var(--wg-text);
                font-size: var(--wg-font-size-base);
                line-height: 1.4;
                min-width: 0;
                word-break: break-word;
            }

            .copyable-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--wg-space-2);
                min-width: 0;
            }

            .copyable-row .value {
                flex: 1;
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                word-break: normal;
            }

            .signatory-list {
                list-style: none;
                padding: 0;
                margin: 0;
                display: flex;
                flex-direction: column;
                gap: var(--wg-space-2);
            }

            .status-badge {
                font-size: var(--wg-font-size-sm);
                font-weight: var(--wg-font-weight-semibold);
                line-height: 1.1;
                vertical-align: middle;
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
                font-size: var(--wg-font-size-sm);
                line-height: var(--wg-line-height-normal);
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

            .approve-btn,
            .delete-btn {
                flex: 1 1 0;
                min-width: 0;
                border-radius: var(--wg-radius-full);
                padding: 0.7rem 1.2rem;
                font-weight: var(--wg-font-weight-semibold);
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: var(--wg-space-2);
                white-space: nowrap;
                transition:
                    background-color 0.2s ease,
                    border-color 0.2s ease,
                    color 0.2s ease;
            }

            .approve-btn {
                border: none;
                background: var(--wg-primary);
                color: var(--wg-primary-text);
            }

            .approve-btn:hover:not(:disabled) {
                background: var(--wg-primary-hover);
            }

            .delete-btn {
                border: 1px solid var(--wg-error);
                background: transparent;
                color: var(--wg-error);
            }

            .delete-btn:hover:not(:disabled) {
                background: rgba(var(--wg-error-rgb), 0.08);
            }

            .approve-btn:disabled,
            .delete-btn:disabled {
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
                <div class="field-header">
                    <h2 class="label">${label}</h2>
                </div>
                <div class="copyable-row">
                    <p class="value">${resolvedValue}</p>
                    ${value
                        ? html`
                              <wg-copy-button
                                  .value=${value}
                                  .label=${copyLabel}
                              ></wg-copy-button>
                          `
                        : nothing}
                </div>
            </section>
        `
    }

    private renderSignatories() {
        const signatories = this.parsed?.signatories || []

        return html`
            <section class="field">
                <div class="field-header">
                    <h2 class="label">Signatories:</h2>
                </div>
                ${signatories.length
                    ? html`
                          <ul class="signatory-list">
                              ${signatories.map(
                                  (signatory) => html`
                                      <li class="copyable-row">
                                          <p class="value">${signatory}</p>
                                          <wg-copy-button
                                              .value=${signatory}
                                              label="Copy signatory"
                                          ></wg-copy-button>
                                      </li>
                                  `
                              )}
                          </ul>
                      `
                    : html`<p class="value">N/A</p>`}
            </section>
        `
    }

    protected render() {
        const activityType = getActivityType(this.parsed)
        const amount = getActivityAmount(this.parsed)
        const decoded = this.parsed?.jsonString || 'N/A'

        return html`
            <div class="page-header">
                <h1 class="page-title">Activity detail</h1>
                ${this.backHref
                    ? html`
                          <a class="back-link" href=${this.backHref}>
                              <span class="icon">${chevronLeftIcon}</span>
                              <span>Back</span>
                          </a>
                      `
                    : nothing}
            </div>

            <div class="detail-grid">
                <section class="field">
                    <div class="field-header">
                        <h2 class="label">Status:</h2>
                    </div>
                    <p class="value">
                        <span
                            class="badge rounded-pill status-badge ${getActivityStatusBadgeClass(
                                this.status
                            )}"
                        >
                            ${getActivityStatusLabel(this.status)}
                        </span>
                    </p>
                </section>

                <section class="field">
                    <div class="field-header">
                        <h2 class="label">Action type:</h2>
                    </div>
                    <p class="value">${activityType}</p>
                </section>

                <section class="field">
                    <div class="field-header">
                        <h2 class="label">Created at:</h2>
                    </div>
                    <p class="value">${formatActivityDate(this.createdAt)}</p>
                </section>

                <section class="field">
                    <div class="field-header">
                        <h2 class="label">Amount:</h2>
                    </div>
                    <p class="value">${amount}</p>
                </section>

                ${this.renderSignatories()}
                ${this.renderCopyableValue(
                    'Template:',
                    this.parsed?.templateId || null,
                    'Copy template'
                )}
                ${this.renderCopyableValue(
                    'Transaction ID:',
                    this.commandId,
                    'Copy transaction ID'
                )}
                ${this.renderCopyableValue(
                    'Transaction hash:',
                    this.txHash,
                    'Copy transaction hash'
                )}

                <section class="field">
                    <div class="field-header">
                        <button
                            type="button"
                            class="toggle-btn"
                            @click=${this.toggleDecoded}
                            aria-expanded=${this.decodedExpanded}
                        >
                            <h2 class="label">Decoded hash:</h2>
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
                        ? html`<pre class="decoded-box">${decoded}</pre>`
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
                <button
                    class="approve-btn"
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

                ${this.status === 'pending'
                    ? html`
                          <button
                              class="delete-btn"
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
                              Delete
                          </button>
                      `
                    : nothing}
            </div>
        `
    }
}
