// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element'
import { chevronDownIcon } from '../icons/index.js'
import type {
    Auth,
    AuthorizationCodeAuth,
    ClientCredentialsAuth,
    SelfIssuedAuth,
    SelfSignedAuth,
} from '@canton-network/core-wallet-user-rpc-client'

export type AuthMethod =
    | 'authorization_code'
    | 'client_credentials'
    | 'self_signed'
    | 'self_issued'

type EditorMode = 'none' | 'view' | 'edit' | 'add' | 'pending-remove'

export class AuthEditorChangeEvent extends Event {
    auth: Auth | undefined

    constructor(auth?: Auth) {
        super('auth-change', { bubbles: true, composed: true })
        this.auth = auth
    }
}

@customElement('auth-editor')
export class AuthEditor extends BaseElement {
    @property({ type: Object }) accessor auth: Auth | undefined
    @property({ type: Array })
    accessor allowedMethods: AuthMethod[] = [
        'authorization_code',
        'client_credentials',
        'self_signed',
        'self_issued',
    ]
    @property({ type: Boolean }) accessor optional = false
    @property({ type: String }) accessor emptyText = 'No auth configured.'
    @property({ type: String }) accessor pendingRemoveText =
        'Auth will be removed after submitting this form.'

    @state() private accessor _mode: EditorMode = 'none'
    @state() private accessor _backup: Auth | undefined
    @state() private accessor _secretReplacement = ''

    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: block;
            }

            .field-group {
                gap: var(--wg-space-2);
                margin-bottom: var(--wg-space-3);
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

            .config-panel {
                border: 1px solid var(--wg-border);
                border-radius: 8px;
                padding: var(--wg-space-3);
                background: var(--wg-input-bg);
                display: flex;
                flex-direction: column;
                gap: var(--wg-space-3);
            }

            .field-help {
                font-size: var(--wg-font-size-xs);
                color: var(--wg-text-secondary);
                margin: 0;
            }

            .auth-summary-list {
                display: flex;
                flex-direction: column;
                gap: var(--wg-space-3);
            }

            .auth-summary-item {
                display: flex;
                flex-direction: column;
                gap: var(--wg-space-1);
            }

            .auth-summary-label {
                font-size: var(--wg-font-size-xs);
                color: var(--wg-text-secondary);
                font-weight: var(--wg-font-weight-semibold);
            }

            .auth-summary-value {
                font-size: var(--wg-font-size-sm);
                color: var(--wg-text);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                margin: 0;
            }

            .inline-actions {
                display: flex;
                gap: var(--wg-space-2);
            }

            .btn-inline {
                border: 1px solid var(--wg-border);
                border-radius: var(--wg-radius-full);
                background: var(--wg-input-bg);
                color: var(--wg-text);
                font-size: var(--wg-font-size-sm);
                font-weight: var(--wg-font-weight-semibold);
                padding: 0.35rem 0.9rem;
                cursor: pointer;
            }

            .btn-inline.danger {
                border-color: var(--wg-error);
                color: var(--wg-error);
            }

            .warning-banner {
                border: 1px solid var(--wg-error);
                border-radius: 8px;
                background: rgba(var(--wg-error-rgb), 0.08);
                color: var(--wg-error);
                padding: var(--wg-space-3);
                font-size: var(--wg-font-size-sm);
            }
        `,
    ]

    protected createRenderRoot(): HTMLElement {
        return this
    }

    connectedCallback(): void {
        super.connectedCallback()
        this._mode = this._initialMode()
    }

    private _hasConfiguredAuth(auth: Auth | undefined): auth is Auth {
        return typeof auth?.method === 'string'
    }

    private _initialMode(): EditorMode {
        if (!this.optional) {
            return 'edit'
        }
        if (this._hasConfiguredAuth(this.auth)) {
            return 'view'
        }
        return 'none'
    }

    private _emit(auth?: Auth) {
        this.dispatchEvent(new AuthEditorChangeEvent(structuredClone(auth)))
    }

    private _defaultAuth(method: AuthMethod): Auth {
        if (method === 'authorization_code') {
            return {
                method,
                clientId: '',
                audience: '',
                scope: '',
            } satisfies AuthorizationCodeAuth
        }

        if (method === 'client_credentials') {
            return {
                method,
                clientId: '',
                audience: '',
                scope: '',
                clientSecret: '',
            } satisfies ClientCredentialsAuth
        }

        if (method === 'self_issued') {
            return {
                method,
                audience: '',
                scope: '',
            } satisfies SelfIssuedAuth
        }

        return {
            method: 'self_signed',
            clientId: '',
            audience: '',
            scope: '',
            issuer: '',
            clientSecret: '',
        } satisfies SelfSignedAuth
    }

    private _maskSecret(secret?: string): string {
        return secret ? '********' : '(not set)'
    }

    private _getSummary(auth: Auth): Array<{ key: string; value: string }> {
        const rows: Array<{ key: string; value: string }> = [
            { key: 'Method', value: auth.method },
            { key: 'Audience', value: auth.audience ?? '' },
            { key: 'Scope', value: auth.scope ?? '' },
        ]

        if ('clientId' in auth) {
            rows.splice(1, 0, {
                key: 'Client Id',
                value: auth.clientId ?? '',
            })
        }

        if ('issuer' in auth) {
            rows.push({ key: 'Issuer', value: auth.issuer ?? '' })
        }
        if ('clientSecret' in auth) {
            rows.push({
                key: 'Client Secret',
                value: this._maskSecret(auth.clientSecret),
            })
        }

        if (auth.method === 'client_credentials' && auth.identityProviderId) {
            rows.push({
                key: 'Identity Provider Id',
                value: auth.identityProviderId,
            })
        }
        return rows
    }

    private _startAdd() {
        this._secretReplacement = ''
        this._mode = 'add'
    }

    private _startEdit() {
        if (this.auth) {
            this._backup = structuredClone(this.auth)
        }
        this._secretReplacement = ''
        this._mode = 'edit'
    }

    private _markForRemove() {
        if (this.auth) {
            this._backup = structuredClone(this.auth)
        }
        this._emit(undefined)
        this._mode = 'pending-remove'
    }

    private _cancelRemove() {
        if (this._backup) {
            const formState: Auth = structuredClone(this._backup)
            this._emit(formState)
            this._mode = 'view'
        } else {
            this._mode = this.optional ? 'none' : 'edit'
        }
    }

    private _cancelEdit() {
        if (this._backup) {
            const formState: Auth = structuredClone(this._backup)
            this._emit(formState)
            this._mode = 'view'
        } else {
            this._emit(undefined)
            this._mode = this.optional ? 'none' : 'edit'
        }
        this._secretReplacement = ''
    }

    private _resolveClientSecret(
        authObj: ClientCredentialsAuth | SelfSignedAuth
    ): string {
        if (this._secretReplacement.trim() !== '') {
            return this._secretReplacement
        }

        if (this._mode === 'add') {
            return ''
        }

        const backupSecret =
            this._backup && 'clientSecret' in this._backup
                ? this._backup.clientSecret
                : undefined
        if (typeof backupSecret === 'string') {
            return backupSecret
        }

        return authObj.clientSecret ?? ''
    }

    private _hasExistingSecret(
        authObj: ClientCredentialsAuth | SelfSignedAuth
    ): boolean {
        if (this._secretReplacement.trim() !== '') {
            return false
        }

        if (this._mode === 'add') {
            return false
        }

        if (
            typeof authObj.clientSecret === 'string' &&
            authObj.clientSecret !== ''
        ) {
            return true
        }

        const backupSecret =
            this._backup && 'clientSecret' in this._backup
                ? this._backup.clientSecret
                : undefined
        return typeof backupSecret === 'string' && backupSecret.length > 0
    }

    private _renderUnsupportedMethodWarning(method: string) {
        return html`<div
            class="warning-banner"
            data-test-id="auth-editor-unsupported-method-warning"
        >
            Unsupported auth method "${method}". Select a supported method to
            continue.
        </div>`
    }

    private _onAuthMethodChange(e: Event) {
        const value = (e.target as HTMLSelectElement).value

        switch (value) {
            case 'authorization_code':
                this._emit({
                    method: 'authorization_code',
                    clientId:
                        this.auth && 'clientId' in this.auth
                            ? this.auth.clientId
                            : '',
                    audience: this.auth?.audience ?? '',
                    scope: this.auth?.scope ?? '',
                } satisfies AuthorizationCodeAuth)
                break

            case 'self_signed':
                this._emit({
                    method: 'self_signed',
                    clientId:
                        this.auth && 'clientId' in this.auth
                            ? this.auth.clientId
                            : '',
                    audience: this.auth?.audience ?? '',
                    scope: this.auth?.scope ?? '',
                    issuer: (this.auth as SelfSignedAuth)?.issuer ?? '',
                    clientSecret:
                        (this.auth as SelfSignedAuth)?.clientSecret ?? '',
                } satisfies SelfSignedAuth)
                break

            case 'self_issued':
                this._emit({
                    method: 'self_issued',
                    audience: this.auth?.audience ?? '',
                    scope: this.auth?.scope ?? '',
                } satisfies SelfIssuedAuth)
                break

            case 'client_credentials':
                this._emit({
                    method: 'client_credentials',
                    ...(this.auth?.method === 'client_credentials' &&
                    this.auth.identityProviderId
                        ? { identityProviderId: this.auth.identityProviderId }
                        : {}),
                    clientId:
                        this.auth && 'clientId' in this.auth
                            ? this.auth.clientId
                            : '',
                    audience: this.auth?.audience ?? '',
                    scope: this.auth?.scope ?? '',
                    clientSecret:
                        (this.auth as ClientCredentialsAuth)?.clientSecret ??
                        '',
                } satisfies ClientCredentialsAuth)
                break
            default:
                throw new Error(`Unsupported auth method: ${value}`)
        }
    }

    _renderIssuerInput(authObj: SelfSignedAuth) {
        return html` <div class="field-group d-flex flex-column">
            <label class="form-label field-label mb-0">
                Issuer <span class="required">*</span>
            </label>
            <input
                class="form-control field-control"
                data-test-id="auth-editor-issuer-input"
                type="text"
                required
                .value=${(authObj as SelfSignedAuth).issuer}
                @change=${(e: Event) => {
                    authObj.issuer = (e.target as HTMLInputElement).value
                    this._emit(authObj)
                }}
            />
        </div>`
    }

    _renderClientIdInput(
        authObj: AuthorizationCodeAuth | ClientCredentialsAuth | SelfSignedAuth
    ) {
        return html` <div class="field-group d-flex flex-column">
            <label class="form-label field-label mb-0">
                Client Id <span class="required">*</span>
            </label>
            <input
                class="form-control field-control"
                data-test-id="auth-editor-client-id-input"
                type="text"
                required
                .value=${authObj.clientId}
                @change=${(e: Event) => {
                    authObj.clientId = (e.target as HTMLInputElement).value
                    this._emit(authObj)
                }}
            />
        </div>`
    }

    _renderClientSecretInput(authObj: ClientCredentialsAuth | SelfSignedAuth) {
        return html` <div class="field-group d-flex flex-column">
            <label class="form-label field-label mb-0">
                Client Secret <span class="required">*</span>
            </label>
            <input
                class="form-control field-control"
                data-test-id="auth-editor-client-secret-input"
                type="text"
                ?required=${!this._hasExistingSecret(authObj)}
                .value=${this._secretReplacement}
                placeholder=${
                    this._hasExistingSecret(authObj) ? '********' : ''
                }
                @change=${(e: Event) => {
                    this._secretReplacement = (
                        e.target as HTMLInputElement
                    ).value
                    authObj.clientSecret = this._resolveClientSecret(authObj)
                    this._emit(authObj)
                }}
            />
            ${
                // oxfmt-ignore
                this._hasExistingSecret(authObj)
                    ? html`<p
                          class="field-help mb-0"
                          data-test-id="auth-editor-secret-help"
                      >
                          Current secret is hidden. Enter a new value to replace it.
                      </p>`
                    : nothing
            }
        </div>`
    }

    _renderIdentityProviderIdInput(authObj: ClientCredentialsAuth) {
        return html` <div class="field-group d-flex flex-column">
            <label class="form-label field-label mb-0">
                Identity Provider Id Override
            </label>
            <input
                class="form-control field-control"
                data-test-id="auth-editor-identity-provider-id-input"
                type="text"
                .value=${authObj.identityProviderId ?? ''}
                @change=${(e: Event) => {
                    const value = (e.target as HTMLInputElement).value.trim()
                    if (value) {
                        authObj.identityProviderId = value
                    } else {
                        delete authObj.identityProviderId
                    }
                    this._emit(authObj)
                }}
            />
            <p class="field-help mb-0">
                Optional. Uses the network identity provider when empty.
            </p>
        </div>`
    }

    private _renderAuthForm(authObj: Auth) {
        const method = authObj.method
        const commonFields = html`
            <div class="field-group d-flex flex-column">
                <label class="form-label field-label mb-0">
                    Method <span class="required">*</span>
                </label>
                <div class="select-wrap">
                    <select
                        class="form-select field-control"
                        data-test-id="auth-editor-method-select"
                        .value=${method}
                        @change=${(e: Event) => {
                            this._onAuthMethodChange(e)
                        }}
                    >
                        ${
                            this.allowedMethods.includes('authorization_code')
                                ? html`<option
                                      ?value="authorization_code"
                                      ?selected=${method === 'authorization_code'}
                                  >
                                      authorization_code
                                  </option>`
                                : nothing
                        }
                        ${
                            this.allowedMethods.includes('client_credentials')
                                ? html`<option
                                      value="client_credentials"
                                      ?selected=${method === 'client_credentials'}
                                  >
                                      client_credentials
                                  </option>`
                                : nothing
                        }
                        ${
                            this.allowedMethods.includes('self_signed')
                                ? html`<option
                                      value="self_signed"
                                      ?selected=${method === 'self_signed'}
                                  >
                                      self_signed
                                  </option>`
                                : nothing
                        }
                        ${
                            this.allowedMethods.includes('self_issued')
                                ? html`<option
                                      value="self_issued"
                                      ?selected=${method === 'self_issued'}
                                  >
                                      self_issued
                                  </option>`
                                : nothing
                        }
                    </select>
                    <span class="select-chevron">${chevronDownIcon}</span>
                </div>
            </div>

            <div class="field-group d-flex flex-column">
                <label class="form-label field-label mb-0">
                    Audience <span class="required">*</span>
                </label>
                <input
                    class="form-control field-control"
                    data-test-id="auth-editor-audience-input"
                    type="text"
                    required
                    .value=${authObj.audience}
                    @change=${(e: Event) => {
                        authObj.audience = (e.target as HTMLInputElement).value
                        this._emit(authObj)
                    }}
                />
            </div>

            <div class="field-group d-flex flex-column">
                <label class="form-label field-label mb-0">
                    Scope <span class="required">*</span>
                </label>
                <input
                    class="form-control field-control"
                    data-test-id="auth-editor-scope-input"
                    type="text"
                    required
                    .value=${authObj.scope}
                    @change=${(e: Event) => {
                        authObj.scope = (e.target as HTMLInputElement).value
                        this._emit(authObj)
                    }}
                />
            </div>
        `

        if (method === 'authorization_code') {
            return html`${commonFields} ${this._renderClientIdInput(authObj)}`
        }

        if (method === 'self_issued') {
            return commonFields
        }

        if (method === 'client_credentials') {
            return html`${commonFields} ${this._renderClientIdInput(authObj)}
            ${this._renderIdentityProviderIdInput(authObj)}
            ${this._renderClientSecretInput(authObj)}`
        }

        if (method === 'self_signed') {
            return html`${commonFields} ${this._renderClientIdInput(authObj)}
            ${this._renderIssuerInput(authObj)}
            ${this._renderClientSecretInput(authObj)}`
        }

        // shouldn't happen, unless parent passes wrong method value. just in case make it recoverable
        return html` ${commonFields}
        ${this._renderUnsupportedMethodWarning(method)}`
    }

    protected render() {
        if (this._mode === 'none') {
            return html`
                <div
                    class="config-panel"
                    data-test-id="auth-editor-empty-state"
                >
                    <p class="field-help" data-test-id="auth-editor-empty-text">
                        ${this.emptyText}
                    </p>
                    <div class="inline-actions">
                        <button
                            type="button"
                            class="btn-inline"
                            data-test-id="auth-editor-add-button"
                            @click=${this._startAdd}
                        >
                            Add
                        </button>
                    </div>
                </div>
            `
        }

        if (this._mode === 'pending-remove') {
            return html`
                <div
                    class="config-panel"
                    data-test-id="auth-editor-pending-remove-state"
                >
                    <div
                        class="warning-banner"
                        data-test-id="auth-editor-pending-remove-text"
                    >
                        ${this.pendingRemoveText}
                    </div>
                    <div class="inline-actions">
                        <button
                            type="button"
                            class="btn-inline"
                            data-test-id="auth-editor-cancel-remove-button"
                            @click=${this._cancelRemove}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            `
        }

        if (this._mode === 'view' && this._hasConfiguredAuth(this.auth)) {
            const rows = this._getSummary(this.auth)
            return html`
                <div class="config-panel" data-test-id="auth-editor-view-state">
                    <dl
                        class="auth-summary-list"
                        data-test-id="auth-editor-summary-list"
                    >
                        ${rows.map(
                            (row) => html`
                                <div
                                    class="auth-summary-item"
                                    data-test-id="auth-editor-summary-row"
                                >
                                    <dt class="auth-summary-label">
                                        ${row.key}
                                    </dt>
                                    <dd
                                        class="auth-summary-value"
                                        title=${row.value}
                                    >
                                        ${row.value}
                                    </dd>
                                </div>
                            `
                        )}
                    </dl>
                    <div class="inline-actions">
                        <button
                            type="button"
                            class="btn-inline"
                            data-test-id="auth-editor-edit-button"
                            @click=${this._startEdit}
                        >
                            Edit
                        </button>
                        <button
                            type="button"
                            class="btn-inline danger"
                            data-test-id="auth-editor-remove-button"
                            @click=${this._markForRemove}
                        >
                            Remove
                        </button>
                    </div>
                </div>
            `
        }

        const auth =
            this.auth && this._hasConfiguredAuth(this.auth)
                ? structuredClone(this.auth)
                : this._defaultAuth(this.allowedMethods[0])

        return html`
            <div data-test-id="auth-editor-edit-state">
                ${this._renderAuthForm(auth)}
            </div>
            ${
                this.optional
                    ? html`<div class="inline-actions">
                          <button
                              type="button"
                              class="btn-inline"
                              data-test-id="auth-editor-cancel-edit-button"
                              @click=${this._cancelEdit}
                          >
                              Cancel
                          </button>
                      </div>`
                    : nothing
            }
        `
    }
}
