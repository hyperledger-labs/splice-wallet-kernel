// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Network, networkSchema } from '@canton-network/core-wallet-store'
import { html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element'
import { FormInputChangedEvent } from './form-input.js'
import {
    AuthorizationCodeAuth,
    ClientCredentialsAuth,
    SelfSignedAuth,
} from '@canton-network/core-wallet-auth'

/**
 * Emitted when the user clicks the Cancel button on the form
 */
export class NetworkEditCancelEvent extends Event {
    constructor() {
        super('network-edit-cancel', { bubbles: true, composed: true })
    }
}

/**
 * Emitted when the user clicks the Save button on the form
 */
export class NetworkEditSaveEvent extends Event {
    network: Network

    constructor(network: Network) {
        super('network-edit-save', { bubbles: true, composed: true })
        this.network = network
    }
}

@customElement('network-form')
export class NetworkForm extends BaseElement {
    @property({ type: Object })
    accessor network: Network = {
        ledgerApi: {},
        auth: {},
    } as Network

    @state() private _error = ''

    static styles = [BaseElement.styles]

    connectedCallback(): void {
        super.connectedCallback()
    }

    handleSubmit(e: Event) {
        e.preventDefault()

        const parsedData = networkSchema.safeParse(this.network)

        if (!parsedData.success) {
            this._error =
                'Invalid network data, please ensure all fields are set correctly'
            console.error('Error parsing network data: ', parsedData.error)
            return
        } else {
            this.dispatchEvent(new NetworkEditSaveEvent(this.network))
        }
    }

    renderAuthForm(authObj: Network['auth']) {
        if (typeof authObj.method === 'undefined') {
            // Use Object.assign to ensure that we are modifying the same object reference in memory,
            // so that changes are reflected in the parent `this.network.auth` (or `this.network.adminAuth`)
            Object.assign(authObj, {
                method: 'authorization_code',
                clientId: '',
                audience: '',
                scope: '',
            } satisfies AuthorizationCodeAuth)
        }

        const commonFields = html`
            <div>
                <label for="authMethod">Method</label>
                <select
                    class="form-select mb-3"
                    name="authMethod"
                    @change=${(e: Event) => {
                        const select = e.target as HTMLSelectElement

                        if (authObj.method === select.value) {
                            return
                        }

                        if (select.value === 'authorization_code') {
                            Object.assign(authObj, {
                                method: 'authorization_code',
                                clientId: authObj.clientId ?? '',
                                audience: authObj.audience ?? '',
                                scope: authObj.scope ?? '',
                            } satisfies AuthorizationCodeAuth)
                        } else if (select.value === 'self_signed') {
                            Object.assign(authObj, {
                                method: 'self_signed',
                                clientId: authObj.clientId ?? '',
                                audience: authObj.audience ?? '',
                                scope: authObj.scope ?? '',
                                issuer:
                                    (authObj as SelfSignedAuth).issuer ?? '',
                                clientSecret:
                                    (authObj as SelfSignedAuth).clientSecret ??
                                    '',
                            } satisfies SelfSignedAuth)
                        } else if (select.value === 'client_credentials') {
                            Object.assign(authObj, {
                                method: 'client_credentials',
                                clientId: authObj.clientId ?? '',
                                audience: authObj.audience ?? '',
                                scope: authObj.scope ?? '',
                                clientSecret:
                                    (authObj as ClientCredentialsAuth)
                                        .clientSecret ?? '',
                            } satisfies ClientCredentialsAuth)
                        } else {
                            throw new Error(
                                `Unsupported auth method: ${select.value}`
                            )
                        }

                        this.requestUpdate()
                    }}
                    .value=${authObj.method}
                >
                    <option value="authorization_code">
                        authorization_code
                    </option>
                    <option value="client_credentials">
                        client_credentials
                    </option>
                    <option value="self_signed">self_signed</option>
                </select>
            </div>

            <form-input
                required
                label="Client Id"
                .value=${authObj.clientId}
                @form-input-change=${(e: FormInputChangedEvent) => {
                    authObj.clientId = e.value
                }}
            ></form-input>
            <form-input
                required
                label="Audience"
                .value=${authObj.audience}
                @form-input-change=${(e: FormInputChangedEvent) => {
                    authObj.audience = e.value
                }}
            >
            </form-input>
            <form-input
                required
                label="Scope"
                .value=${authObj.scope}
                @form-input-change=${(e: FormInputChangedEvent) => {
                    authObj.scope = e.value
                }}
            ></form-input>
        `

        if (authObj.method === 'authorization_code') {
            return html`${commonFields}`
        } else if (authObj.method === 'client_credentials') {
            return html`${commonFields}
                <form-input
                    required
                    label="Client Secret"
                    .value=${(authObj as ClientCredentialsAuth).clientSecret}
                    @form-input-change=${(e: FormInputChangedEvent) => {
                        ;(authObj as ClientCredentialsAuth).clientSecret =
                            e.value
                    }}
                ></form-input>`
        } else if (authObj.method === 'self_signed') {
            return html`${commonFields}
                <form-input
                    required
                    label="Issuer"
                    .value=${(authObj as SelfSignedAuth).issuer}
                    @form-input-change=${(e: FormInputChangedEvent) => {
                        ;(authObj as SelfSignedAuth).issuer = e.value
                    }}
                ></form-input>
                <form-input
                    required
                    label="Client Secret"
                    .value=${(authObj as SelfSignedAuth).clientSecret}
                    @form-input-change=${(e: FormInputChangedEvent) => {
                        ;(authObj as SelfSignedAuth).clientSecret = e.value
                    }}
                ></form-input>`
        } else {
            throw new Error(
                `Unsupported auth method: ${JSON.stringify(authObj)}`
            )
        }
    }

    render() {
        return html`
            <form @submit=${this.handleSubmit}>
                <form-input
                    required
                    label="Network Id"
                    text="A unique identifier for the network"
                    .value=${this.network.id ?? ''}
                    @form-input-change=${(e: FormInputChangedEvent) => {
                        this.network.id = e.value
                    }}
                ></form-input>

                <form-input
                    required
                    label="Name"
                    .value=${this.network.name ?? ''}
                    @form-input-change=${(e: FormInputChangedEvent) => {
                        this.network.name = e.value
                    }}
                ></form-input>

                <form-input
                    required
                    label="Description"
                    .value=${this.network.description ?? ''}
                    @form-input-change=${(e: FormInputChangedEvent) => {
                        this.network.description = e.value
                    }}
                ></form-input>

                <form-input
                    label="Synchronizer Id (Optional)"
                    .value=${this.network.synchronizerId ?? ''}
                    @form-input-change=${(e: FormInputChangedEvent) => {
                        this.network.synchronizerId =
                            e.value === '' ? undefined : e.value
                    }}
                ></form-input>

                <form-input
                    required
                    label="Identity Provider Id"
                    .value=${this.network.identityProviderId ?? ''}
                    @form-input-change=${(e: FormInputChangedEvent) => {
                        this.network.identityProviderId = e.value
                    }}
                ></form-input>

                <form-input
                    required
                    label="Ledger API Base Url"
                    .value=${this.network.ledgerApi.baseUrl ?? ''}
                    @form-input-change=${(e: FormInputChangedEvent) => {
                        this.network.ledgerApi.baseUrl = e.value
                    }}
                ></form-input>

                <div>
                    <h2 class="form-text mb-4 fw-bold">
                        🔐 Configure User Auth
                    </h2>
                    <div class="form-control mb-3">
                        ${this.renderAuthForm(this.network.auth)}
                    </div>
                </div>

                <div>
                    <h2 class="form-text mb-4 fw-bold">
                        🔐 Configure Admin Auth (optional)
                    </h2>
                    <div class="form-control mb-3">
                        ${typeof this.network.adminAuth === 'undefined'
                            ? html`<button
                                  class="btn btn-sm btn-primary mb-2"
                                  type="button"
                                  @click=${() => {
                                      this.network.adminAuth = {
                                          method: 'client_credentials',
                                          clientId: '',
                                          audience: '',
                                          scope: '',
                                          clientSecret: '',
                                      }
                                      this.requestUpdate()
                                  }}
                              >
                                  +
                              </button>`
                            : html`<button
                                      class="btn btn-sm btn-secondary mb-2"
                                      type="button"
                                      @click=${() => {
                                          this.network.adminAuth = undefined
                                          this.requestUpdate()
                                      }}
                                  >
                                      clear
                                  </button>
                                  ${this.renderAuthForm(this.network.adminAuth)}`}
                    </div>
                </div>

                <div class="mt-1 mb-1 text-danger">${this._error}</div>

                <div>
                    <button class="btn btn-sm btn-primary" type="submit">
                        Save
                    </button>
                    <button
                        class="btn btn-sm btn-secondary"
                        type="button"
                        @click=${() =>
                            this.dispatchEvent(new NetworkEditCancelEvent())}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        `
    }
}
