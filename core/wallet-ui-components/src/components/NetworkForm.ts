// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    ClientCredentials,
    Network,
    networkSchema,
    PasswordAuth,
    SelfSignedAuth,
} from '@canton-network/core-wallet-store'
import { html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { BaseElement } from '../internal/BaseElement.js'
import { NetworkInputChangedEvent } from './NetworkFormInput.js'

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

type NetworkKeys = Exclude<keyof Network, 'auth' | 'ledgerApi'>
type LedgerApiKeys = keyof Network['ledgerApi']

type CommonAuth = Exclude<keyof Network['auth'], 'type' | 'admin'>
type AdminAuth = keyof ClientCredentials
type PasswordAuthKeys = Exclude<keyof PasswordAuth, 'type' | 'admin'>

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

        this.updateAuthStructure()
    }

    updateAuthStructure() {
        const network = { ...this.network }

        if (this.authType === 'implicit') {
            network.auth = {
                type: 'implicit',
                identityProviderId: network.auth?.identityProviderId || '',
                configUrl: network.auth?.configUrl || '',
                clientId: network.auth?.clientId || '',
                issuer: network.auth?.issuer || '',
                audience: network.auth?.audience || '',
                scope: network.auth?.scope || '',
                admin: network.auth?.admin,
            }
        } else if (this.authType === 'password') {
            network.auth = {
                type: 'password',
                identityProviderId: network.auth?.identityProviderId || '',
                configUrl: network.auth?.configUrl || '',
                clientId: network.auth?.clientId || '',
                issuer: network.auth?.issuer || '',
                audience: network.auth?.audience || '',
                scope: network.auth?.scope || '',
                tokenUrl: (network.auth as PasswordAuth)?.tokenUrl || '',
                grantType: (network.auth as PasswordAuth)?.grantType || '',
                admin: network.auth?.admin,
            }
        } else if (this.authType === 'self_signed') {
            network.auth = {
                type: 'self_signed',
                identityProviderId: network.auth?.identityProviderId || '',
                issuer: network.auth?.issuer || '',
                audience: network.auth?.audience || '',
                scope: network.auth?.scope || '',
                clientId: network.auth?.clientId || '',
                clientSecret:
                    (network.auth as SelfSignedAuth)?.clientSecret || '',
                admin: network.auth?.admin,
            }
        }

        this.network = network
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

    renderAuthForm() {
        console.log('calling render auth')
        const commonFields = html`
            <network-form-input
                required
                label="Identity Provider ID"
                .value=${this.network.auth.identityProviderId}
                @network-input-change=${this.setAuth('identityProviderId')}
            ></network-form-input>
            <network-form-input
                required
                label="Config URL"
                text="URL to the OpenID Connect configuration (e.g. https://<your-domain>/.well-known/openid-configuration)"
                .value=${this.network.auth.configUrl}
                @network-input-change=${this.setAuth('configUrl')}
            ></network-form-input>
            <network-form-input
                required
                label="Client Id"
                .value=${this.network.auth.clientId}
                @network-input-change=${this.setAuth('clientId')}
            ></network-form-input>
            <network-form-input
                required
                label="Issuer"
                .value=${this.network.auth.issuer}
                @network-input-change=${this.setAuth('issuer')}
            ></network-form-input>
            <network-form-input
                required
                label="Audience"
                .value=${this.network.auth.audience}
                @network-input-change=${this.setAuth('audience')}
            >
            </network-form-input>
            <network-form-input
                required
                label="Scope"
                .value=${this.network.auth.scope}
                @network-input-change=${this.setAuth('scope')}
            ></network-form-input>
        `

        const adminFields = html`
            <div class="form-control">
                <div class="form-text mb-4 fw-bold">
                    Admin auth fields (optional)
                </div>
                <network-form-input
                    label="Admin Client Id"
                    .value=${this.network.auth.admin?.clientId ?? ''}
                    @network-input-change=${this.setAdminAuth('clientId')}
                ></network-form-input>
                <network-form-input
                    hideable
                    label="Admin Client Secret"
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
                    identityProviderId: '',
                    configUrl: '',
                    clientId: '',
                    issuer: '',
                    audience: '',
                    scope: '',
                }
                this.network.auth = auth
            }

            return html`${commonFields}${adminFields}`
        } else if (this.authType === 'password') {
            let auth = this.network.auth
            if (auth.type !== 'password') {
                auth = {
                    type: 'password',
                    identityProviderId: '',
                    configUrl: '',
                    clientId: '',
                    issuer: '',
                    audience: '',
                    scope: '',
                    tokenUrl: '',
                    grantType: '',
                }
                this.network.auth = auth
            }

            const netauth = this.network.auth as PasswordAuth

            return html`
                ${commonFields}
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
                ${adminFields}
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
                    <div>
                        <label for="authType">Auth Type</label>
                        <select
                            class="form-select mb-3"
                            name="authType"
                            @change=${this.onAuthTypeChange}
                            .value=${this.authType}
                        >
                            <option value="password">password</option>
                            <option value="implicit">implicit</option>
                        </select>
                    </div>
                </div>

                <div class="form-control mb-3">
                    <h6 class="form-text mb-4 fw-bold">
                        Configuring ${this.authType} auth
                    </h6>
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
