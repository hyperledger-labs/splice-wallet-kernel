// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html, nothing } from 'lit'
import { customElement, property, query, state } from 'lit/decorators.js'
import { Idp } from '@canton-network/core-wallet-user-rpc-client'
import { BaseElement } from '../internal/base-element'
import { chevronDownIcon } from '../icons/index.js'

/** Emitted when the user saves (add or update) an IDP */
export class IdpFormSaveEvent extends Event {
    constructor(public idp: Idp) {
        super('idp-form-save', { bubbles: true, composed: true })
    }
}

/** Emitted when the user clicks Delete */
export class IdpFormDeleteEvent extends Event {
    constructor(public idp: Idp) {
        super('idp-form-delete', { bubbles: true, composed: true })
    }
}

/** Emitted when the user clicks Cancel */
export class IdpFormCancelEvent extends Event {
    constructor() {
        super('idp-form-cancel', { bubbles: true, composed: true })
    }
}

/** Emitted when the user clicks Back */
export class IdpFormBackEvent extends Event {
    constructor() {
        super('idp-form-back', { bubbles: true, composed: true })
    }
}

@customElement('idp-form')
export class IdpFormComponent extends BaseElement {
    /** 'add' = creating a new IDP, 'review' = viewing/editing an existing one */
    @property({ type: String })
    accessor mode: 'add' | 'review' = 'add'

    @property({ type: Object })
    accessor idp: Idp = {
        id: '',
        type: 'oauth',
        issuer: '',
        configUrl: '',
    }

    @property({ type: Boolean }) loading = false

    @state() private _error = ''

    @query('#idp-id') accessor idpIdInput: HTMLInputElement | null = null
    @query('#idp-type') accessor idpTypeSelect: HTMLSelectElement | null = null
    @query('#idp-issuer') accessor idpIssuerInput: HTMLInputElement | null =
        null
    @query('#idp-config-url')
    accessor idpConfigUrlInput: HTMLInputElement | null = null

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

    private handleSubmit(e: Event) {
        e.preventDefault()

        const id = this.idpIdInput?.value ?? this.idp.id
        const type = this.idpTypeSelect?.value ?? this.idp.type
        const issuer = this.idpIssuerInput?.value ?? this.idp.issuer
        const configUrl = this.idpConfigUrlInput?.value ?? this.idp.configUrl

        if (!id || !type || !issuer) {
            this._error = 'Please fill in all required fields'
            return
        }

        this._error = ''
        const result: Idp = { id, type, issuer }
        if (type === 'oauth' && configUrl) {
            result.configUrl = configUrl
        }
        this.dispatchEvent(new IdpFormSaveEvent(result))
    }

    render() {
        const isReview = this.mode === 'review'

        return html`
            <form class="d-flex flex-column h-100" @submit=${this.handleSubmit}>
                <div class="form-fields d-flex flex-column">
                    <div class="field-group d-flex flex-column">
                        <label for="idp-id" class="form-label field-label mb-0">
                            ID <span class="required">*</span>
                        </label>
                        <input
                            ?disabled=${this.loading}
                            class="form-control field-control"
                            id="idp-id"
                            type="text"
                            placeholder="Enter the identity provider ID"
                            .value=${this.idp.id}
                            required
                        />
                        <p class="field-help mb-0">
                            A unique identifier for the identity provider
                        </p>
                    </div>

                    <div class="field-group d-flex flex-column">
                        <label
                            for="idp-type"
                            class="form-label field-label mb-0"
                        >
                            Type <span class="required">*</span>
                        </label>
                        <div class="select-wrap">
                            <select
                                ?disabled=${this.loading}
                                class="form-select field-control"
                                id="idp-type"
                                .value=${this.idp.type}
                                required
                            >
                                <option value="oauth">oauth</option>
                                <option value="self_signed">self_signed</option>
                            </select>
                            <span class="select-chevron"
                                >${chevronDownIcon}</span
                            >
                        </div>
                    </div>

                    <div class="field-group d-flex flex-column">
                        <label
                            for="idp-issuer"
                            class="form-label field-label mb-0"
                        >
                            Issuer URL <span class="required">*</span>
                        </label>
                        <input
                            ?disabled=${this.loading}
                            class="form-control field-control"
                            id="idp-issuer"
                            type="text"
                            placeholder="Enter the issuer URL"
                            .value=${this.idp.issuer}
                            required
                        />
                    </div>

                    <div class="field-group d-flex flex-column">
                        <label
                            for="idp-config-url"
                            class="form-label field-label mb-0"
                        >
                            Config URL <span class="required">*</span>
                        </label>
                        <input
                            ?disabled=${this.loading}
                            class="form-control field-control"
                            id="idp-config-url"
                            type="text"
                            placeholder="Enter the configuration URL"
                            .value=${this.idp.configUrl ?? ''}
                        />
                    </div>
                </div>

                ${this._error
                    ? html`<div class="form-error">${this._error}</div>`
                    : nothing}
                ${isReview
                    ? html`
                          <div class="delete-section">
                              <h4 class="delete-title">
                                  Delete identity provider
                              </h4>
                              <p class="delete-desc">
                                  You will not be able to undo the change once
                                  you delete this Identity Provider.
                              </p>
                              <button
                                  type="button"
                                  class="btn-delete"
                                  @click=${() =>
                                      this.dispatchEvent(
                                          new IdpFormDeleteEvent(this.idp)
                                      )}
                              >
                                  Delete identity provider
                              </button>
                          </div>

                          <div class="form-actions">
                              <button
                                  type="button"
                                  class="btn-cancel"
                                  @click=${() =>
                                      this.dispatchEvent(
                                          new IdpFormCancelEvent()
                                      )}
                              >
                                  Cancel
                              </button>
                              <button
                                  class="btn btn-primary rounded-pill btn-submit"
                                  ?disabled=${this.loading}
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
                                  ?disabled=${this.loading}
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
