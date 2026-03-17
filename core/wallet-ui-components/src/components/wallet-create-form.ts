// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html } from 'lit'
import { customElement, property, query } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element.js'

export class WalletCreateEvent extends Event {
    constructor(
        public partyHint: string,
        public signingProviderId: string,
        public primary: boolean
    ) {
        super('wallet-create', { bubbles: true, composed: true })
    }
}

// TODO: should we rename this to party-create-form?
@customElement('wg-wallet-create-form')
export class WgWalletCreateForm extends BaseElement {
    @property({ type: Array }) signingProviders: string[] = []
    @property({ type: Array }) networkIds: string[] = []
    @property({ type: Boolean }) loading = false
    @property({ type: String }) submitLabel = 'Add'

    @query('#party-id-hint') accessor partyHintInput: HTMLInputElement | null =
        null
    @query('#signing-provider-id')
    accessor signingProviderSelect: HTMLSelectElement | null = null
    @query('#primary') accessor primaryCheckbox: HTMLInputElement | null = null

    static styles = [
        BaseElement.styles,
        css`
            .form-page {
                padding: 0;
                background: transparent;
                border: none;
                box-shadow: none;
                min-height: min(640px, calc(100vh - 210px));
            }

            .form {
                display: flex;
                flex-direction: column;
                min-height: 100%;
            }

            .field {
                margin-bottom: var(--wg-space-3);
            }

            .label {
                display: block;
                margin-bottom: var(--wg-space-1);
                font-size: var(--wg-font-size-xs);
                font-weight: var(--wg-font-weight-semibold);
                text-transform: uppercase;
                letter-spacing: 0.04em;
            }

            .required {
                color: var(--wg-label-required-color);
            }

            .input,
            .select {
                width: 100%;
                border: 1px solid var(--wg-input-border);
                border-radius: var(--wg-radius-md);
                background: var(--wg-input-bg);
                color: var(--wg-input-text);
                font-size: var(--wg-font-size-sm);
                padding: 0.6rem 0.75rem;
                outline: none;
            }

            .input:focus,
            .select:focus {
                border-color: var(--wg-input-border-focus);
                box-shadow: 0 0 0 0.15rem rgba(var(--wg-accent-rgb), 0.18);
            }

            .checkbox-row {
                display: flex;
                align-items: center;
                gap: var(--wg-space-2);
                margin-bottom: var(--wg-space-4);
            }

            .form-check-input {
                accent-color: var(--wg-accent);
            }

            .submit-row {
                margin-top: auto;
                padding-top: var(--wg-space-6);
            }

            .submit-btn {
                width: 100%;
                border: none;
                border-radius: 20px;
                padding: 0.65rem 0.8rem;
                font-size: var(--wg-font-size-sm);
                font-weight: var(--wg-font-weight-semibold);
                color: var(--wg-primary-text);
                background: var(--wg-primary);
            }

            .submit-btn:hover:not(:disabled) {
                background: var(--wg-primary-hover);
            }

            .submit-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
        `,
    ]

    private onSubmit(event: Event) {
        event.preventDefault()

        const partyHint = this.partyHintInput?.value || ''
        const signingProviderId = this.signingProviderSelect?.value || ''
        const primary = this.primaryCheckbox?.checked || false

        this.dispatchEvent(
            new WalletCreateEvent(partyHint, signingProviderId, primary)
        )
    }

    reset() {
        if (this.partyHintInput) {
            this.partyHintInput.value = ''
        }
        if (this.primaryCheckbox) {
            this.primaryCheckbox.checked = false
        }
    }

    protected render() {
        const networkOptions =
            this.networkIds.length > 0 ? this.networkIds : ['Connected network']

        return html`
            <section class="form-page">
                <form class="form" @submit=${this.onSubmit}>
                    <div class="field">
                        <label for="party-id-hint" class="label">
                            Party ID Hint <span class="required">*</span>
                        </label>
                        <input
                            ?disabled=${this.loading}
                            class="input"
                            id="party-id-hint"
                            type="text"
                            placeholder="Enter the name of your wallet?"
                            required
                        />
                    </div>

                    <div class="field">
                        <label for="signing-provider-id" class="label">
                            Signing Provider <span class="required">*</span>
                        </label>
                        <select
                            ?disabled=${this.loading}
                            class="select"
                            id="signing-provider-id"
                            required
                        >
                            <option disabled selected value="">
                                Select signing provider
                            </option>
                            ${this.signingProviders.map(
                                (providerId) =>
                                    html`<option value=${providerId}>
                                        ${providerId}
                                    </option>`
                            )}
                        </select>
                    </div>

                    <div class="field">
                        <label for="network-id" class="label">
                            Network <span class="required">*</span>
                        </label>
                        <select
                            class="select"
                            id="network-id"
                            ?disabled=${this.loading ||
                            networkOptions.length <= 1}
                        >
                            ${networkOptions.map(
                                (networkId) =>
                                    html`<option value=${networkId}>
                                        ${networkId}
                                    </option>`
                            )}
                        </select>
                    </div>

                    <div class="checkbox-row">
                        <input
                            id="primary"
                            type="checkbox"
                            class="form-check-input"
                            ?disabled=${this.loading}
                        />
                        <label for="primary" class="form-check-label"
                            >Set as primary wallet</label
                        >
                    </div>

                    <div class="submit-row">
                        <button
                            class="submit-btn"
                            ?disabled=${this.loading}
                            type="submit"
                        >
                            ${this.submitLabel}
                        </button>
                    </div>
                </form>
            </section>
        `
    }
}
