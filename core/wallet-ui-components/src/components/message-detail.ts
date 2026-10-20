// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, css, nothing } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import './back-link.js'
import './copy-button.js'
import { BaseElement } from '../internal/base-element.js'
import {
    getActivityStatusBadgeClass,
    getActivityStatusLabel,
    renderCopyableValue,
} from '../internal/activity-utils.js'

/** Emitted when the user clicks the "Approve" button */
export class MessageApproveEvent extends Event {
    constructor(public messageId: string) {
        super('message-approve', { bubbles: true, composed: true })
    }
}

/** Emitted when the user clicks the "Reject" button */
export class MessageDeleteEvent extends Event {
    constructor(public messageId: string) {
        super('message-delete', { bubbles: true, composed: true })
    }
}

@customElement('wg-message-detail')
export class WgMessageDetail extends BaseElement {
    @property() messageId = ''

    @property() message = ''

    @property() status = ''

    @property() externalTxId: string | null = null

    @property() origin: string | null = null

    @property() backHref = ''

    @property({ type: Boolean }) isApproving = false

    @property({ type: Boolean }) isDeleting = false

    @property({ type: Boolean }) isSigning = false

    // Disables action buttons regardless of status
    @property({ type: Boolean }) disabled = false

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

            .detail-value .value,
            .detail-value wg-copy-button {
                flex: 0 0 auto;
            }

            .detail-value .value {
                flex: 1;
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                word-break: normal;
            }

            .message-box {
                margin: 0;
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
                text-align: left;
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
        return (
            this.disabled ||
            this.isApproving ||
            this.isDeleting ||
            this.isSigning
        )
    }

    private get isDeleteDisabled() {
        return this.disabled || this.isApproving || this.isDeleting
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

    protected render() {
        return html`
            <div class="page-header">
                <h1 class="page-title h4 fw-semibold mb-0">Message Details</h1>
                ${
                    this.backHref
                        ? html`<wg-back-link
                              href=${this.backHref}
                          ></wg-back-link>`
                        : nothing
                }
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
                ${
                    this.origin
                        ? this.renderInlineField('Requested by', this.origin)
                        : nothing
                }
                ${
                    this.externalTxId
                        ? renderCopyableValue(
                              'External transaction ID',
                              this.externalTxId,
                              'Copy external transaction ID'
                          )
                        : nothing
                }

                <section class="field field--stacked">
                    <h2
                        class="label small fw-semibold text-body-secondary mb-0"
                    >
                        Message
                    </h2>
                    <pre class="message-box small">${this.message}</pre>
                </section>
            </div>

            ${this.renderActionButtons()}
        `
    }

    private renderActionButtons() {
        if (this.status !== 'pending') {
            return nothing
        }

        return html`
            <div class="actions">
                <button
                    class="btn btn-outline-danger rounded-pill d-inline-flex align-items-center justify-content-center gap-2"
                    ?disabled=${this.isDeleteDisabled}
                    @click=${() =>
                        this.dispatchEvent(
                            new MessageDeleteEvent(this.messageId)
                        )}
                >
                    ${
                        this.isDeleting
                            ? html`<div
                                  class="spinner-border spinner-border-sm"
                              ></div>`
                            : nothing
                    }
                    Reject
                </button>

                <button
                    class="btn btn-primary rounded-pill d-inline-flex align-items-center justify-content-center gap-2"
                    ?disabled=${this.isApproveDisabled}
                    @click=${() =>
                        this.dispatchEvent(
                            new MessageApproveEvent(this.messageId)
                        )}
                >
                    ${
                        this.isApproving || this.isSigning
                            ? html`<div
                                  class="spinner-border spinner-border-sm"
                              ></div>`
                            : nothing
                    }
                    Approve
                </button>
            </div>
        `
    }
}
