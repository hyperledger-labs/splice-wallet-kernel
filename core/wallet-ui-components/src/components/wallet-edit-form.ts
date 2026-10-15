// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html, nothing } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { chevronDownIcon } from '../icons/index.js'
import { SigningProviderChangeEvent, WgWalletForm } from './wallet-form.js'
import type {
    Key,
    SigningProviderId,
} from '@canton-network/core-wallet-user-rpc-client'
import type { PartyId } from '@canton-network/core-types'

export class WalletEditEvent extends Event {
    constructor(
        public partyId: PartyId,
        public signingProviderId: SigningProviderId,
        public publicKey: Key['publicKey']
    ) {
        super('wallet-edit', { bubbles: true, composed: true })
    }
}

@customElement('wg-wallet-edit-form')
export class WgWalletEditForm extends WgWalletForm {
    protected readonly submitLabel = 'Edit'
    protected readonly submittingLabel = 'Editing...'
    protected readonly submittingMessage = 'Editing party, please wait...'

    @property() readonly partyId = ''
    @property() accessor selectedPublicKey = ''
    @property() accessor selectedSigningProvider = ''
    @property({ type: Array }) disabledSigningProviders: string[] = []

    static styles = [
        WgWalletForm.styles,
        css`
            .spinner {
                left: 1em;
                transform: translateY(-50%);
            }
        `,
    ]

    protected onSubmit = (event: SubmitEvent) => {
        event.preventDefault()

        if (
            this.isLoading ||
            !this.selectedPublicKey ||
            !this.selectedSigningProvider
        ) {
            return
        }

        this.dispatchEvent(
            new WalletEditEvent(
                this.partyId,
                this.selectedSigningProvider,
                this.selectedPublicKey
            )
        )
    }

    private onSigningProviderChange(event: Event) {
        const signingProviderId = (event.target as HTMLSelectElement).value
        this.selectedSigningProvider = signingProviderId
        this.selectedPublicKey = ''
        this.dispatchEvent(new SigningProviderChangeEvent(signingProviderId))
    }

    private onPublicKeyChange(event: Event) {
        const publicKey = (event.target as HTMLSelectElement).value
        this.selectedPublicKey = publicKey
    }

    protected get isLoading(): boolean {
        return this.submitting || this.signingProvidersLoading
    }

    protected get submitDisabled(): boolean {
        return (
            this.hasNoSigningProviders ||
            !this.selectedSigningProvider.length ||
            this.disabledSigningProviders.includes(
                this.selectedSigningProvider
            ) ||
            this.publicKeysLoading
        )
    }

    protected get formFields() {
        return html`
            <div class="field-group d-flex flex-column">
                <label for="party-id" class="form-label field-label mb-0">
                    Party ID <span class="required">*</span>
                </label>
                <input
                    ?disabled=${true}
                    .value=${this.partyId}
                    class="form-control field-control"
                    id="party-id"
                    type="text"
                    required
                    readonly
                />
            </div>

            <div class="field-group d-flex flex-column">
                <label
                    for="signing-provider-id"
                    class="form-label field-label mb-0"
                >
                    Signing Provider <span class="required">*</span>
                </label>
                <div class="select-wrap">
                    <select
                        .value=${this.selectedSigningProvider}
                        ?disabled=${
                            this.submitting ||
                            this.signingProvidersLoading ||
                            this.hasNoSigningProviders
                        }
                        class="form-select field-control"
                        id="signing-provider-id"
                        required
                        @change=${this.onSigningProviderChange}
                    >
                        <option
                            disabled
                            .selected=${!this.selectedSigningProvider}
                            value=""
                        >
                            ${
                                this.signingProvidersLoading
                                    ? this.signingProvidersLoadingLabel
                                    : this.hasNoSigningProviders
                                      ? this.noSigningProvidersLabel
                                      : 'Select signing provider'
                            }
                        </option>
                        ${this.signingProviders.map(
                            (providerId) =>
                                html`<option
                                    value=${providerId}
                                    .selected=${
                                        this.selectedSigningProvider ===
                                        providerId
                                    }
                                    ?disabled=${this.disabledSigningProviders.includes(providerId)}
                                >
                                    ${providerId}
                                </option>`
                        )}
                    </select>
                    <span class="select-chevron">${chevronDownIcon}</span>
                </div>
            </div>

            <div class="field-group d-flex flex-column">
                <label for="public-key-id" class="form-label field-label mb-0">
                    Public Key <span class="required">*</span>
                </label>
                <div class="select-wrap">
                    <select
                        .value=${this.selectedPublicKey}
                        @change=${this.onPublicKeyChange}
                        ?disabled=${this.submitting}
                        class="form-select field-control"
                        id="public-key-id"
                        required
                    >
                        <option
                            disabled
                            .selected=${!this.selectedPublicKey || this.disabledSigningProviders.includes(this.selectedSigningProvider)}
                            value=""
                        >
                            ${this.publicKeysLoading ? nothing : this.disabledSigningProviders.includes(this.selectedSigningProvider) ? 'Select different signing provider' : 'Select public key'}
                        </option>
                        ${this.publicKeys.map(
                            (key) =>
                                html`<option
                                    value=${key.publicKey}
                                    .selected=${
                                        this.selectedPublicKey === key.publicKey
                                    }
                                >
                                    ${key.name} (${key.publicKey})
                                </option>`
                        )}
                    </select>
                    ${
                        this.publicKeysLoading
                            ? html`<div
                                  class="spinner d-inline position-absolute top-50"
                              >
                                  <span
                                      class="spinner-border spinner-border-sm"
                                      aria-hidden="true"
                                  ></span>
                              </div>`
                            : nothing
                    }
                    <span class="select-chevron">${chevronDownIcon}</span>
                </div>
            </div>
        `
    }
}
