// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html } from 'lit'
import { customElement, property, query, state } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element.js'

/** Emitted when the user submits the wallet creation form */
export class WalletCreateEvent extends Event {
    constructor(
        public partyHint: string,
        public signingProviderId: string,
        public primary: boolean
    ) {
        super('wallet-create', { bubbles: true, composed: true })
    }
}

@customElement('wg-wallet-create-form')
export class WgWalletCreateForm extends BaseElement {
    /** Available signing provider IDs to show in the dropdown */
    @property({ type: Array }) signingProviders: string[] = []

    /** Disables the form inputs and submit button when true */
    @property({ type: Boolean }) loading = false

    /** Message displayed after successful creation (e.g. "Created party ID: ...") */
    @state() accessor successMessage: string | null = null

    @query('#party-id-hint')
    accessor _partyHintInput: HTMLInputElement | null = null

    @query('#signing-provider-id')
    accessor _signingProviderSelect: HTMLSelectElement | null = null

    @query('#primary')
    accessor _primaryCheckbox: HTMLInputElement | null = null

    static styles = [BaseElement.styles]

    private _onSubmit(e: Event) {
        e.preventDefault()

        const partyHint = this._partyHintInput?.value || ''
        const signingProviderId = this._signingProviderSelect?.value || ''
        const primary = this._primaryCheckbox?.checked || false

        this.dispatchEvent(
            new WalletCreateEvent(partyHint, signingProviderId, primary)
        )
    }

    /** Reset the form inputs after a successful creation */
    reset() {
        if (this._partyHintInput) {
            this._partyHintInput.value = ''
        }
        if (this._primaryCheckbox) {
            this._primaryCheckbox.checked = false
        }
        this.successMessage = null
    }

    protected render() {
        return html`
            <div class="card shadow-sm">
                <div class="card-body">
                    <form id="create-wallet-form" @submit=${this._onSubmit}>
                        <div class="mb-3">
                            <label for="party-id-hint" class="form-label"
                                >Party ID Hint:</label
                            >
                            <input
                                ?disabled=${this.loading}
                                class="form-control"
                                id="party-id-hint"
                                type="text"
                                placeholder="Enter party ID hint"
                                required
                            />
                        </div>

                        <div class="mb-3">
                            <label for="signing-provider-id" class="form-label"
                                >Signing Provider:</label
                            >
                            <select
                                class="form-select"
                                id="signing-provider-id"
                            >
                                <option disabled value="">
                                    Signing provider for wallet
                                </option>
                                ${this.signingProviders.map(
                                    (providerId) =>
                                        html`<option value=${providerId}>
                                            ${providerId}
                                        </option>`
                                )}
                            </select>
                        </div>

                        <div
                            class="mb-3 form-check d-flex align-items-center gap-2"
                        >
                            <input
                                id="primary"
                                type="checkbox"
                                class="form-check-input"
                            />
                            <label for="primary" class="form-check-label"
                                >Set as primary wallet</label
                            >
                        </div>

                        <button
                            class="btn btn-primary"
                            ?disabled=${this.loading}
                            type="submit"
                        >
                            Create
                        </button>
                    </form>
                    ${this.successMessage
                        ? html`<p class="mt-2">${this.successMessage}</p>`
                        : ''}
                </div>
            </div>
        `
    }
}
