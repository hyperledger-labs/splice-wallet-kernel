// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    ClientCredentials,
    ImplicitAuth,
    Network,
    networkSchema,
    PasswordAuth,
} from '@canton-network/core-wallet-store'
import { html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { BaseElement } from '../internal/BaseElement.js'

/**
 * Emitted when the value of an individual form input changes
 */
class NetworkInputChangedEvent extends Event {
    value: string

    constructor(value: string) {
        super('network-input-change', { bubbles: true, composed: true })
        this.value = value
    }
}

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

@customElement('network-form-input')
export class NetworkFormInput extends BaseElement {
    @property({ type: String }) label = ''
    @property({ type: String }) value = ''
    @property({ type: String }) text = ''
    @property({ type: Boolean }) required = false

    static styles = [BaseElement.styles]

    render() {
        return html`
            <div class="mb-3">
                <label for=${this.label}>${this.label}</label>
                <input
                    .value=${this.value}
                    ?required=${this.required}
                    @change=${(e: Event) => {
                        const input = e.target as HTMLInputElement
                        this.value = input.value

                        this.dispatchEvent(
                            new NetworkInputChangedEvent(this.value)
                        )
                    }}
                    type="text"
                    class="form-control"
                    name=${this.label}
                />
                ${this.text
                    ? html`<div class="form-text">${this.text}</div>`
                    : null}
            </div>
        `
    }
}

type NetworkKeys = Exclude<keyof Network, 'auth' | 'ledgerApi'>
type LedgerApiKeys = keyof Network['ledgerApi']

type CommonAuth = Exclude<keyof Network['auth'], 'type' | 'admin'>
type AdminAuth = keyof ClientCredentials
type PasswordAuthKeys = Exclude<keyof PasswordAuth, 'type' | 'admin'>
type ImplicitAuthKeys = Exclude<keyof ImplicitAuth, 'type' | 'admin'>

@customElement('network-form')
export class NetworkForm extends BaseElement {
    @property({ type: Object }) network: Network = {
        ledgerApi: {},
        auth: {},
    } as Network
    @property({ type: String }) authType: string = 'implicit'

    @state() private _error = ''

    static styles = [BaseElement.styles]

    connectedCallback(): void {
        super.connectedCallback()
        if (this.network.auth.type) {
            this.authType = this.network.auth.type
        }
    }

    onAuthTypeChange(e: Event) {
        const select = e.target as HTMLSelectElement
        this.authType = select.value
    }

    handleSubmit(e: Event) {
        e.preventDefault()

        console.log('this network', this.network)
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

    setNetwork(field: NetworkKeys) {
        return (ev: NetworkInputChangedEvent) => {
            this.network[field] = ev.value
        }
    }

    setLedgerApi(field: LedgerApiKeys) {
        return (ev: NetworkInputChangedEvent) => {
            if (!this.network.ledgerApi) {
                this.network.ledgerApi = {
                    baseUrl: '',
                }
            }
            this.network.ledgerApi[field] = ev.value
        }
    }

    setAuth(field: CommonAuth) {
        return (ev: NetworkInputChangedEvent) => {
            this.network.auth[field] = ev.value
        }
    }

    setAdminAuth(field: AdminAuth) {
        return (ev: NetworkInputChangedEvent) => {
            if (this.network.auth.admin) {
                this.network.auth.admin[field] = ev.value
            }
        }
    }

    setPasswordAuth(field: PasswordAuthKeys) {
        return (ev: NetworkInputChangedEvent) => {
            if (this.network.auth.type !== 'password') {
                return
            }

            if (!this.network.auth) {
                this.network.auth = {
                    type: 'password',
                    clientId: '',
                    identityProviderId: '',
                    issuer: '',
                    configUrl: '',
                    audience: '',
                    tokenUrl: '',
                    grantType: '',
                    scope: '',
                }
            }
            this.network.auth[field] = ev.value
        }
    }

    setImplicitAuth(field: ImplicitAuthKeys) {
        return (ev: NetworkInputChangedEvent) => {
            if (this.network.auth.type !== 'implicit') {
                return
            }

            if (!this.network.auth) {
                this.network.auth = {
                    type: 'implicit',
                    clientId: '',
                    identityProviderId: '',
                    issuer: '',
                    configUrl: '',
                    audience: '',
                    scope: '',
                }
            }
            this.network.auth[field] = ev.value
        }
    }

    renderAuthForm() {
        console.log('calling render auth')
        const commonFields = html`
            <network-form-input
                required
                label="Scope"
                .value=${this.network.auth.scope}
                @network-input-change=${this.setAuth('scope')}
            ></network-form-input>
            <network-form-input
                required
                label="Audience"
                .value=${this.network.auth.audience}
                @network-input-change=${this.setAuth('audience')}
            >
            </network-form-input>

            <div class="form-control">
                <div class="form-text">admin auth fields (optional)</div>
                <network-form-input
                    label="Admin ClientId"
                    .value=${this.network.auth.admin?.clientId ?? ''}
                    @network-input-change=${this.setAdminAuth('clientId')}
                ></network-form-input>
                <network-form-input
                    label="Admin ClientSecret"
                    .value=${this.network.auth.admin?.clientSecret ?? ''}
                    @network-input-change=${this.setAdminAuth('clientSecret')}
                ></network-form-input>
            </div>
        `

        if (this.authType === 'implicit') {
            let auth = this.network.auth
            if (auth.type !== 'implicit') {
                auth = {
                    type: 'implicit',
                    clientId: '',
                    identityProviderId: '',
                    issuer: '',
                    configUrl: '',
                    scope: '',
                    audience: '',
                }
                this.network.auth = auth
            }

            return html`
                <network-form-input
                    required
                    label="ClientId"
                    .value=${this.network.auth.clientId}
                    @network-input-change=${this.setAuth('clientId')}
                ></network-form-input>
                ${commonFields}
            `
        } else if (this.authType === 'password') {
            let auth = this.network.auth
            if (auth.type !== 'password') {
                auth = {
                    type: 'password',
                    clientId: '',
                    identityProviderId: '',
                    issuer: '',
                    configUrl: '',
                    audience: '',
                    tokenUrl: '',
                    grantType: '',
                    scope: '',
                }
                this.network.auth = auth
            }

            const netauth = this.network.auth as PasswordAuth

            return html`
                <network-form-input
                    required
                    label="Token Url"
                    .value=${netauth.tokenUrl}
                    @network-input-change=${this.setPasswordAuth('tokenUrl')}
                ></network-form-input>
                <network-form-input
                    required
                    label="Grant Type"
                    .value=${netauth.grantType}
                    @network-input-change=${this.setPasswordAuth('grantType')}
                ></network-form-input>
                ${commonFields}
            `
        } else {
            throw new Error(`Unsupported auth type: ${this.authType}`)
        }
    }

    render() {
        return html`
            <form @submit=${this.handleSubmit}>
                <network-form-input
                    required
                    label="Name"
                    .value=${this.network.name ?? ''}
                    @network-input-change=${this.setNetwork('name')}
                ></network-form-input>

                <network-form-input
                    required
                    label="Network Id"
                    .value=${this.network.chainId ?? ''}
                    @network-input-change=${this.setNetwork('chainId')}
                ></network-form-input>

                <network-form-input
                    required
                    label="Synchronizer Id"
                    .value=${this.network.synchronizerId ?? ''}
                    @network-input-change=${this.setNetwork('synchronizerId')}
                ></network-form-input>

                <network-form-input
                    required
                    label="Description"
                    .value=${this.network.description ?? ''}
                    @network-input-change=${this.setNetwork('description')}
                ></network-form-input>

                <network-form-input
                    required
                    label="Ledger API Base Url"
                    .value=${this.network.ledgerApi.baseUrl ?? ''}
                    @network-input-change=${this.setLedgerApi('baseUrl')}
                ></network-form-input>

                <div class="row mb-3">
                    <div class="col-md-2">
                        <label for="authType">Auth Type</label>
                        <select
                            class="form-select mb-3"
                            name="authType"
                            @network-input-change=${this.onAuthTypeChange}
                            .value=${this.authType}
                        >
                            <option value="password">password</option>
                            <option value="implicit">implicit</option>
                        </select>
                    </div>
                </div>

                <div class="form-control mb-3">
                    <h6 class="form-text">${this.authType} auth config</h6>
                    ${this.renderAuthForm()}
                </div>

                <div class="mt-1 mb-1 text-danger">${this._error}</div>

                <div class="buttons">
                    <button class="btn btn-primary" type="submit">Save</button>
                    <button
                        class="btn btn-secondary"
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
