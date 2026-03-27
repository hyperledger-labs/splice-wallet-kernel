// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Network, networkSchema } from '@canton-network/core-wallet-store'
import { css, html, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element'
import { chevronDownIcon } from '../icons/index.js'
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
 * Emitted when the user clicks the Save/Add/Update button on the form
 */
export class NetworkEditSaveEvent extends Event {
    network: Network

    constructor(network: Network) {
        super('network-edit-save', { bubbles: true, composed: true })
        this.network = network
    }
}

/**
 * Emitted when the user clicks the Delete button
 */
export class NetworkDeleteEvent extends Event {
    network: Network

    constructor(network: Network) {
        super('network-delete', { bubbles: true, composed: true })
        this.network = network
    }
}

/**
 * Emitted when the user clicks the Back link
 */
export class NetworkFormBackEvent extends Event {
    constructor() {
        super('network-form-back', { bubbles: true, composed: true })
    }
}

@customElement('network-form')
export class NetworkForm extends BaseElement {
    @property({ type: String })
    accessor mode: 'add' | 'review' = 'add'

    @property({ type: Object })
    accessor network: Network = {
        ledgerApi: {},
        auth: {},
    } as Network

    @state() private _error = ''

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

            .btn-cancel {
                flex: 1;
                border: 1px solid var(--wg-border);
                border-radius: var(--wg-radius-full);
                background: var(--wg-input-bg);
                color: var(--wg-text);
                font-size: var(--wg-font-size-base);
                font-weight: var(--wg-font-weight-semibold);
                padding: 0.7rem 1.5rem;
                cursor: pointer;
                transition:
                    background 0.2s ease,
                    opacity 0.2s ease;
            }

            .btn-cancel:hover {
                background: var(--wg-border);
            }
        `,
    ]

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
            Object.assign(authObj, {
                method: 'authorization_code',
                clientId: '',
                audience: '',
                scope: '',
            } satisfies AuthorizationCodeAuth)
        }

        const commonFields = html`
            <div class="field-group d-flex flex-column">
                <label class="form-label field-label mb-0">
                    Method <span class="required">*</span>
                </label>
                <div class="select-wrap">
                    <select
                        class="form-select field-control"
                        @change=${(e: Event) => {
                            const select = e.target as HTMLSelectElement
                            if (authObj.method === select.value) return

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
                                        (authObj as SelfSignedAuth).issuer ??
                                        '',
                                    clientSecret:
                                        (authObj as SelfSignedAuth)
                                            .clientSecret ?? '',
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
                    <span class="select-chevron">${chevronDownIcon}</span>
                </div>
            </div>

            <div class="field-group d-flex flex-column">
                <label class="form-label field-label mb-0">
                    Client Id <span class="required">*</span>
                </label>
                <input
                    class="form-control field-control"
                    type="text"
                    required
                    .value=${authObj.clientId}
                    @change=${(e: Event) => {
                        authObj.clientId = (e.target as HTMLInputElement).value
                    }}
                />
            </div>

            <div class="field-group d-flex flex-column">
                <label class="form-label field-label mb-0">
                    Audience <span class="required">*</span>
                </label>
                <input
                    class="form-control field-control"
                    type="text"
                    required
                    .value=${authObj.audience}
                    @change=${(e: Event) => {
                        authObj.audience = (e.target as HTMLInputElement).value
                    }}
                />
            </div>

            <div class="field-group d-flex flex-column">
                <label class="form-label field-label mb-0">
                    Scope <span class="required">*</span>
                </label>
                <input
                    class="form-control field-control"
                    type="text"
                    required
                    .value=${authObj.scope}
                    @change=${(e: Event) => {
                        authObj.scope = (e.target as HTMLInputElement).value
                    }}
                />
            </div>
        `

        if (authObj.method === 'authorization_code') {
            return html`${commonFields}`
        } else if (authObj.method === 'client_credentials') {
            return html`${commonFields}
                <div class="field-group d-flex flex-column">
                    <label class="form-label field-label mb-0">
                        Client Secret <span class="required">*</span>
                    </label>
                    <input
                        class="form-control field-control"
                        type="text"
                        required
                        .value=${(authObj as ClientCredentialsAuth)
                            .clientSecret}
                        @change=${(e: Event) => {
                            ;(authObj as ClientCredentialsAuth).clientSecret = (
                                e.target as HTMLInputElement
                            ).value
                        }}
                    />
                </div>`
        } else if (authObj.method === 'self_signed') {
            return html`${commonFields}
                <div class="field-group d-flex flex-column">
                    <label class="form-label field-label mb-0">
                        Issuer <span class="required">*</span>
                    </label>
                    <input
                        class="form-control field-control"
                        type="text"
                        required
                        .value=${(authObj as SelfSignedAuth).issuer}
                        @change=${(e: Event) => {
                            ;(authObj as SelfSignedAuth).issuer = (
                                e.target as HTMLInputElement
                            ).value
                        }}
                    />
                </div>
                <div class="field-group d-flex flex-column">
                    <label class="form-label field-label mb-0">
                        Client Secret <span class="required">*</span>
                    </label>
                    <input
                        class="form-control field-control"
                        type="text"
                        required
                        .value=${(authObj as SelfSignedAuth).clientSecret}
                        @change=${(e: Event) => {
                            ;(authObj as SelfSignedAuth).clientSecret = (
                                e.target as HTMLInputElement
                            ).value
                        }}
                    />
                </div>`
        } else {
            throw new Error(
                `Unsupported auth method: ${JSON.stringify(authObj)}`
            )
        }
    }

    render() {
        const isReview = this.mode === 'review'

        return html`
            <form class="d-flex flex-column h-100" @submit=${this.handleSubmit}>
                <div class="form-fields d-flex flex-column">
                    <div class="field-group d-flex flex-column">
                        <label class="form-label field-label mb-0">
                            Network Id <span class="required">*</span>
                        </label>
                        <input
                            class="form-control field-control"
                            type="text"
                            required
                            .value=${this.network.id ?? ''}
                            @change=${(e: Event) => {
                                this.network.id = (
                                    e.target as HTMLInputElement
                                ).value
                            }}
                        />
                        <p class="field-help mb-0">
                            A unique identifier for the network
                        </p>
                    </div>

                    <div class="field-group d-flex flex-column">
                        <label class="form-label field-label mb-0">
                            Name <span class="required">*</span>
                        </label>
                        <input
                            class="form-control field-control"
                            type="text"
                            required
                            .value=${this.network.name ?? ''}
                            @change=${(e: Event) => {
                                this.network.name = (
                                    e.target as HTMLInputElement
                                ).value
                            }}
                        />
                    </div>

                    <div class="field-group d-flex flex-column">
                        <label class="form-label field-label mb-0">
                            Description <span class="required">*</span>
                        </label>
                        <input
                            class="form-control field-control"
                            type="text"
                            required
                            .value=${this.network.description ?? ''}
                            @change=${(e: Event) => {
                                this.network.description = (
                                    e.target as HTMLInputElement
                                ).value
                            }}
                        />
                    </div>

                    <div class="field-group d-flex flex-column">
                        <label class="form-label field-label mb-0">
                            Synchronizer Id
                        </label>
                        <input
                            class="form-control field-control"
                            type="text"
                            .value=${this.network.synchronizerId ?? ''}
                            @change=${(e: Event) => {
                                const val = (e.target as HTMLInputElement).value
                                this.network.synchronizerId =
                                    val === '' ? undefined : val
                            }}
                        />
                    </div>

                    <div class="field-group d-flex flex-column">
                        <label class="form-label field-label mb-0">
                            Identity Provider Id
                            <span class="required">*</span>
                        </label>
                        <input
                            class="form-control field-control"
                            type="text"
                            required
                            .value=${this.network.identityProviderId ?? ''}
                            @change=${(e: Event) => {
                                this.network.identityProviderId = (
                                    e.target as HTMLInputElement
                                ).value
                            }}
                        />
                    </div>

                    <div class="field-group d-flex flex-column">
                        <label class="form-label field-label mb-0">
                            Ledger API Base Url
                            <span class="required">*</span>
                        </label>
                        <input
                            class="form-control field-control"
                            type="text"
                            required
                            .value=${this.network.ledgerApi.baseUrl ?? ''}
                            @change=${(e: Event) => {
                                this.network.ledgerApi.baseUrl = (
                                    e.target as HTMLInputElement
                                ).value
                            }}
                        />
                    </div>

                    ${isReview
                        ? html`
                              <h3 class="section-title">Configure user auth</h3>
                              ${this.renderAuthForm(this.network.auth)}
                          `
                        : nothing}
                </div>

                ${this._error
                    ? html`<div class="form-error">${this._error}</div>`
                    : nothing}
                ${isReview
                    ? html`
                          <div class="delete-section">
                              <h4 class="delete-title">Delete network</h4>
                              <p class="delete-desc">
                                  You will not be able to undo the change once
                                  you delete this network.
                              </p>
                              <button
                                  type="button"
                                  class="btn-delete"
                                  @click=${() =>
                                      this.dispatchEvent(
                                          new NetworkDeleteEvent(this.network)
                                      )}
                              >
                                  Delete Network
                              </button>
                          </div>

                          <div class="form-actions">
                              <button
                                  type="button"
                                  class="btn-cancel"
                                  @click=${() =>
                                      this.dispatchEvent(
                                          new NetworkEditCancelEvent()
                                      )}
                              >
                                  Cancel
                              </button>
                              <button
                                  class="btn btn-primary rounded-pill flex-fill"
                                  type="submit"
                              >
                                  Update
                              </button>
                          </div>
                      `
                    : html`
                          <div class="mt-auto pt-3">
                              <button
                                  class="btn btn-primary rounded-pill w-100"
                                  type="submit"
                              >
                                  Add
                              </button>
                          </div>
                      `}
            </form>
        `
    }
}
