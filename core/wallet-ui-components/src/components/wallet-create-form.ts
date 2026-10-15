// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { chevronDownIcon } from '../icons/index.js'
import { SigningProviderChangeEvent, WgWalletForm } from './wallet-form.js'
import type {
    KeyName,
    PartyHint,
    SigningProviderId,
} from '@canton-network/core-wallet-user-rpc-client'
export { SigningProviderChangeEvent } from './wallet-form.js'

export class WalletCreateEvent extends Event {
    constructor(
        public partyHint: PartyHint,
        public signingProviderId: SigningProviderId,
        public primary: boolean,
        public keyName?: KeyName | undefined
    ) {
        super('wallet-create', { bubbles: true, composed: true })
    }
}

@customElement('wg-wallet-create-form')
export class WgWalletCreateForm extends WgWalletForm {
    protected readonly submitLabel = 'Add'
    protected readonly submittingLabel = 'Adding...'
    protected readonly submittingMessage = 'Creating party, please wait...'
    protected get submitDisabled(): boolean {
        return this.hasNoSigningProviders
    }

    @property({ type: Array }) keySigningProviders: string[] = []
    @property({ type: Boolean }) showPrimary = true

    @state() accessor partyHint = ''
    @property() accessor selectedSigningProvider = ''
    @state() accessor isPrimaryValue = false
    @state() accessor publicKeyValue = ''

    protected onSubmit = (event: SubmitEvent) => {
        event.preventDefault()

        if (this.isLoading || this.hasNoSigningProviders) {
            return
        }

        const selectedKey = this.publicKeys.find(
            (key) => key.id === this.publicKeyValue
        )
        const keyName = selectedKey?.name

        this.dispatchEvent(
            new WalletCreateEvent(
                this.partyHint,
                this.selectedSigningProvider,
                this.isPrimaryValue,
                keyName
            )
        )
    }

    private get showPublicKeySelect(): boolean {
        return (
            !!this.selectedSigningProvider &&
            this.keySigningProviders.includes(this.selectedSigningProvider)
        )
    }

    private onSigningProviderChange(event: Event) {
        const signingProviderId = (event.target as HTMLSelectElement).value
        this.selectedSigningProvider = signingProviderId
        this.publicKeyValue = ''
        this.dispatchEvent(new SigningProviderChangeEvent(signingProviderId))
    }

    protected get isLoading(): boolean {
        return (
            this.submitting ||
            this.signingProvidersLoading ||
            (this.showPublicKeySelect && this.publicKeysLoading)
        )
    }

    private onPartyHintInput = (event: InputEvent) => {
        this.partyHint = (event.target as HTMLInputElement).value
    }

    private onPublicKeyChange = (event: Event) => {
        this.publicKeyValue = (event.target as HTMLSelectElement).value
    }

    private onPrimaryChange = (event: Event) => {
        this.isPrimaryValue = (event.target as HTMLInputElement).checked
    }

    protected get formFields() {
        return html`
            <div class="field-group d-flex flex-column">
                <label for="party-id-hint" class="form-label field-label mb-0">
                    Party ID Hint <span class="required">*</span>
                </label>
                <input
                    .value=${this.partyHint}
                    @input=${this.onPartyHintInput}
                    ?disabled=${this.submitting}
                    class="form-control field-control"
                    id="party-id-hint"
                    type="text"
                    placeholder="Enter the name of your wallet?"
                    required
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
                                >
                                    ${providerId}
                                </option>`
                        )}
                    </select>
                    <span class="select-chevron">${chevronDownIcon}</span>
                </div>
            </div>

            ${
                this.showPublicKeySelect
                    ? html`
                          <div class="field-group d-flex flex-column">
                              <label
                                  for="vault-name"
                                  class="form-label field-label mb-0"
                              >
                                  Vault name
                                  <span class="required">*</span>
                              </label>
                              <div class="select-wrap">
                                  <select
                                      .value=${this.publicKeyValue}
                                      @change=${this.onPublicKeyChange}
                                      ?disabled=${this.isLoading}
                                      class="form-select field-control"
                                      id="vault-name"
                                      required
                                  >
                                      <option
                                          disabled
                                          .selected=${!this.publicKeyValue}
                                          value=""
                                      >
                                          ${
                                              this.isLoading
                                                  ? 'Loading vaults...'
                                                  : 'Select vault name'
                                          }
                                      </option>
                                      ${this.publicKeys.map(
                                          (key) =>
                                              html`<option
                                                  value=${key.id}
                                                  .selected=${
                                                      this.publicKeyValue ===
                                                      key.id
                                                  }
                                              >
                                                  ${key.name}
                                              </option>`
                                      )}
                                  </select>
                                  <span class="select-chevron"
                                      >${chevronDownIcon}</span
                                  >
                              </div>
                          </div>
                      `
                    : nothing
            }
            ${
                this.showPrimary
                    ? html`
                          <div class="primary-row mb-0">
                              <input
                                  id="primary"
                                  type="checkbox"
                                  .checked=${this.isPrimaryValue}
                                  @change=${this.onPrimaryChange}
                                  class="form-check-input"
                                  ?disabled=${this.submitting}
                              />
                              <label
                                  for="primary"
                                  class="form-check-label primary-label"
                                  >Set as primary wallet</label
                              >
                          </div>
                      `
                    : nothing
            }
        `
    }
}
