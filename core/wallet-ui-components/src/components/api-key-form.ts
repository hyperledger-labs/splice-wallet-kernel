// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element'
import type { GenerateApiKeyParams } from '@canton-network/core-wallet-user-rpc-client'

/**
 * Emitted when the user clicks the Generate button on the form
 */
export class ApiKeyGenerateEvent extends Event {
    constructor(public apiKeyParams: GenerateApiKeyParams) {
        super('api-key-generate', { bubbles: true, composed: true })
    }
}

@customElement('api-key-form')
export class ApiKeyForm extends BaseElement {
    @property({ type: Object })
    accessor apiKeyParams: GenerateApiKeyParams = {
        name: '',
    }

    @state() private accessor _error = ''

    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: block;
            }

            .form-fields {
                gap: var(--wg-space-4);
            }

            .field-group {
                gap: var(--wg-space-2);
            }

            .field-label {
                font-size: var(--wg-font-size-sm);
                font-weight: var(--wg-font-weight-medium);
                color: var(--wg-text-secondary);
                line-height: var(--wg-line-height-tight);
            }

            .required {
                color: var(--wg-label-required-color);
            }

            .field-help {
                font-size: var(--wg-font-size-xs);
                color: var(--wg-text-secondary);
                margin-top: calc(-1 * var(--wg-space-1));
            }

            .field-control {
                width: 100%;
                border: 1px solid var(--wg-input-border);
                border-radius: 4px;
                background: var(--wg-input-bg);
                color: var(--wg-input-text);
                padding: 12px 14px;
            }

            .field-control::placeholder {
                color: var(--wg-input-placeholder);
            }

            .field-control:focus {
                border-color: var(--wg-input-border-focus);
                box-shadow: 0 0 0 3px rgba(var(--wg-accent-rgb), 0.12);
            }

            .select-wrap {
                position: relative;
            }

            .select-wrap .field-control {
                padding-right: 40px;
                appearance: none;
                -webkit-appearance: none;
            }

            .select-chevron {
                position: absolute;
                top: 50%;
                right: 12px;
                transform: translateY(-50%);
                color: var(--wg-text-secondary);
                pointer-events: none;
                display: inline-flex;
            }

            .section-title {
                margin: var(--wg-space-4) 0 var(--wg-space-2);
                font-size: var(--wg-font-size-base);
                font-weight: var(--wg-font-weight-bold);
                color: var(--wg-text);
            }

            .delete-section {
                margin-top: var(--wg-space-8);
                padding-top: var(--wg-space-6);
                border-top: 1px solid var(--wg-border);
            }

            .delete-title {
                margin: 0 0 var(--wg-space-2);
                font-size: var(--wg-font-size-base);
                font-weight: var(--wg-font-weight-bold);
                color: var(--wg-text);
            }

            .delete-desc {
                margin: 0 0 var(--wg-space-4);
                font-size: var(--wg-font-size-sm);
                color: var(--wg-text-secondary);
            }

            .btn-delete {
                display: inline-flex;
                align-items: center;
                gap: var(--wg-space-1);
                border: 1px solid var(--wg-error);
                border-radius: var(--wg-radius-full);
                background: transparent;
                color: var(--wg-error);
                font-size: var(--wg-font-size-sm);
                font-weight: var(--wg-font-weight-semibold);
                padding: 0.4rem 1rem;
                cursor: pointer;
                transition:
                    background 0.2s ease,
                    color 0.2s ease;
            }

            .btn-delete:hover {
                background: rgba(var(--wg-error-rgb), 0.08);
            }

            .form-error {
                color: var(--wg-error);
                font-size: var(--wg-font-size-sm);
                margin: var(--wg-space-2) 0;
            }

            .form-actions {
                display: flex;
                gap: var(--wg-space-3);
                margin-top: var(--wg-space-6);
            }

            .form-actions > button {
                flex: 1 1 0;
                min-width: 0;
                min-height: 2.875rem;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 0.7rem 1.5rem;
                font-size: var(--wg-font-size-base);
                font-weight: var(--wg-font-weight-semibold);
                line-height: 1.2;
            }

            .btn-cancel {
                border: 1px solid var(--wg-border);
                border-radius: var(--wg-radius-full);
                background: var(--wg-input-bg);
                color: var(--wg-text);
                cursor: pointer;
                transition:
                    background 0.2s ease,
                    opacity 0.2s ease;
            }

            .btn-cancel:hover {
                background: var(--wg-border);
            }

            .btn-submit {
                border-width: 1px;
            }
        `,
    ]

    handleSubmit(e: Event) {
        e.preventDefault()
        this.dispatchEvent(new ApiKeyGenerateEvent(this.apiKeyParams))
    }

    render() {
        return html`
            <form class="d-flex flex-column h-100" @submit=${this.handleSubmit}>
                <div class="form-fields d-flex flex-column">
                    <div class="field-group d-flex flex-column">
                        <label class="form-label field-label mb-0">
                            Name <span class="required">*</span>
                        </label>
                        <input
                            class="form-control field-control"
                            type="text"
                            required
                            .value=${this.apiKeyParams.name ?? ''}
                            @change=${(e: Event) => {
                                this.apiKeyParams.name = (
                                    e.target as HTMLInputElement
                                ).value
                            }}
                        />
                    </div>
                </div>

                ${
                    this._error
                        ? html`<div class="form-error">${this._error}</div>`
                        : nothing
                }

                <div class="mt-auto pt-3">
                    <button
                        class="btn btn-primary rounded-pill w-100"
                        type="submit"
                    >
                        Generate
                    </button>
                </div>
            </form>
        `
    }
}
