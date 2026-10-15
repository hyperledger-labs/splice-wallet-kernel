// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html, nothing, type TemplateResult } from 'lit'
import { BaseElement } from '../internal/base-element.js'
import type {
    Key,
    SigningProviderId,
} from '@canton-network/core-wallet-user-rpc-client'
import { property } from 'lit/decorators.js'

export class SigningProviderChangeEvent extends Event {
    constructor(public signingProviderId: SigningProviderId) {
        super('signing-provider-change', { bubbles: true, composed: true })
    }
}

export abstract class WgWalletForm extends BaseElement {
    protected abstract onSubmit: (event: SubmitEvent) => void | Promise<void>
    protected abstract submittingLabel: string
    protected abstract submitLabel: string
    protected abstract submittingMessage: string
    protected abstract get formFields(): TemplateResult
    protected abstract get isLoading(): boolean
    protected abstract get submitDisabled(): boolean

    @property({ type: Array }) signingProviders: string[] = []
    @property({ type: Boolean }) signingProvidersLoading = false
    @property({ type: String }) signingProvidersLoadingLabel =
        'Loading signing providers...'
    @property({ type: String }) noSigningProvidersLabel =
        'No signing providers available'
    @property({ type: Boolean }) submitting = false
    @property({ type: Boolean }) publicKeysLoading = false
    @property({ type: Array }) publicKeys: Key[] = []

    protected get hasNoSigningProviders(): boolean {
        return (
            !this.signingProvidersLoading && this.signingProviders.length === 0
        )
    }

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

            .field-control:disabled {
                background: rgba(15, 23, 42, 0.04);
                color: var(--wg-text-secondary);
                opacity: 1;
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

            .primary-row {
                display: flex;
                align-items: center;
                gap: var(--wg-space-2);
                margin-top: var(--wg-space-1);
                padding: 0;
                border: none;
                background: transparent;
            }

            .form-check-input {
                accent-color: var(--wg-primary);
                margin: 0;
                flex: 0 0 auto;
            }

            .primary-row .form-check-input {
                float: none;
                margin-left: 0;
            }

            .form-check-input:focus {
                box-shadow: 0 0 0 3px rgba(var(--wg-accent-rgb), 0.12);
            }

            .primary-label {
                color: var(--wg-text-secondary);
                font-size: var(--wg-font-size-sm);
                font-weight: var(--wg-font-weight-medium);
            }

            .submit-wrap {
                gap: var(--wg-space-3);
            }

            .submit-button {
                min-height: 44px;
            }

            .loading-message {
                margin: 0;
                color: var(--wg-text-secondary);
                font-size: var(--wg-font-size-sm);
                text-align: center;
            }
        `,
    ]

    protected render() {
        return html`
            <form class="d-flex flex-column h-100" @submit=${this.onSubmit}>
                <div class="form-fields d-flex flex-column">
                    ${this.formFields}
                </div>

                <div class="submit-wrap mt-auto pt-3 d-flex flex-column">
                    <button
                        class="submit-button btn btn-primary rounded-pill w-100 d-inline-flex align-items-center justify-content-center gap-2"
                        ?disabled=${this.isLoading || this.submitDisabled}
                        type="submit"
                    >
                        ${
                            this.submitting
                                ? html`<span
                                      class="spinner-border spinner-border-sm"
                                      aria-hidden="true"
                                  ></span>`
                                : nothing
                        }
                        ${
                            this.submitting
                                ? this.submittingLabel
                                : this.submitLabel
                        }
                    </button>

                    ${
                        this.submitting
                            ? html`<p
                                  class="loading-message"
                                  role="status"
                                  aria-live="polite"
                              >
                                  ${this.submittingMessage}
                              </p>`
                            : nothing
                    }
                </div>
            </form>
        `
    }
}
