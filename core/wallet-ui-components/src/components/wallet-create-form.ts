// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html } from 'lit'
import { customElement, property, query } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element.js'
import { cardStyles } from '../styles/card.js'

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

    @query('#party-id-hint') accessor partyHintInput: HTMLInputElement | null =
        null
    @query('#signing-provider-id')
    accessor signingProviderSelect: HTMLSelectElement | null = null
    @query('#primary') accessor primaryCheckbox: HTMLInputElement | null = null

    static styles = [
        BaseElement.styles,
        cardStyles,
        css`
            .form-card {
                padding: var(--wg-space-4);
            }

            .title {
                margin: 0 0 var(--wg-space-3);
                font-size: var(--wg-font-size-lg);
                font-weight: var(--wg-font-weight-semibold);
                color: var(--wg-text);
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
                color: var(--wg-label-color);
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

            .submit-btn {
                width: 100%;
                border: none;
                border-radius: var(--wg-radius-md);
                padding: 0.65rem 0.8rem;
                font-size: var(--wg-font-size-sm);
                font-weight: var(--wg-font-weight-semibold);
                color: var(--wg-primary-text);
                background: var(--wg-primary);
            }

            .submit-btn:hover:not(:disabled) {
                background: var(--wg-primary-hover);
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
            <section class="wg-card form-card">
                <h2 class="title">Add a new party</h2>
                <form @submit=${this.onSubmit}>
                    <div class="field">
                        <label for="party-id-hint" class="label"
                            >Party ID hint</label
                        >
                        <input
                            ?disabled=${this.loading}
                            class="input"
                            id="party-id-hint"
                            type="text"
                            placeholder="Enter party ID hint"
                            required
                        />
                    </div>

                    <div class="field">
                        <label for="signing-provider-id" class="label"
                            >Signing provider</label
                        >
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
                        <label for="network-id" class="label">Network</label>
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
                            >Set as primary party</label
                        >
                    </div>

                    <button
                        class="submit-btn"
                        ?disabled=${this.loading}
                        type="submit"
                    >
                        Add
                    </button>
                </form>
            </section>
        `
    }
}
