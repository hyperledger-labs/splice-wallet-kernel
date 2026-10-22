// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html, nothing, type PropertyValues } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import './back-link.js'
import { BaseElement } from '../internal/base-element.js'
import type {
    PublicNetwork,
    Idp,
} from '@canton-network/core-wallet-user-rpc-client'
import { chevronDownIcon } from '../icons'
import cantonLogo from '../../images/logos/canton-logo.png'

/** Emitted when the user clicks the Connect button */
export class LoginConnectEvent extends Event {
    constructor(
        public selectedNetwork: PublicNetwork,
        public selectedIdp: Idp,
        public clientId?: string,
        public clientSecret?: string,
        public username?: string
    ) {
        super('login-connect', { bubbles: true, composed: true })
    }
}

/** Emitted when the user clicks the Back link */
export class LoginBackEvent extends Event {
    constructor() {
        super('login-back', {
            bubbles: true,
            composed: true,
            cancelable: true,
        })
    }
}

@customElement('wg-login-form')
export class WgLoginForm extends BaseElement {
    /** Available networks to show in the dropdown */
    @property({ type: Array }) accessor networks: PublicNetwork[] = []

    /** Available identity providers */
    @property({ type: Array }) accessor idps: Idp[] = []

    /** Locks form until idps and networks are loaded */
    @property({ type: Boolean }) accessor loading = false

    @property({ type: Boolean }) accessor connecting = false
    @property({ type: String }) accessor backHref = '/'

    @state() accessor selectedNetwork: PublicNetwork | null = null
    @state() accessor message: string | null = null
    @state() accessor messageType: 'error' | 'info' | null = null

    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: block;
                min-height: 100dvh;
            }

            .screen {
                min-height: 100dvh;
                display: flex;
                flex-direction: column;
            }

            .top-bar {
                height: 44px;
                display: flex;
                align-items: center;
                padding: 0 14px;
                border-bottom: 1px solid #d1d5db;
            }

            .top-logo {
                width: 24px;
                height: 24px;
                object-fit: contain;
                display: block;
            }

            .content {
                flex: 1;
                padding: 14px 16px 0;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .title-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                margin-bottom: 20px;
            }

            .select-wrap {
                position: relative;
            }

            .network-select,
            .login-input {
                width: 100%;
                border: 1px solid #d4d4d8;
                border-radius: 4px;
                background: var(--wg-input-bg);
                padding: 12px 40px 12px 14px;
                font: inherit;
                line-height: var(--bs-body-line-height);
                outline: none;
                appearance: none;
            }

            .network-select:focus,
            .login-input:focus {
                border-color: var(--wg-input-border-focus);
                box-shadow: 0 0 0 3px rgba(var(--wg-accent-rgb), 0.12);
            }

            .select-chevron {
                position: absolute;
                right: 12px;
                top: 50%;
                transform: translateY(-50%);
                color: #222;
                pointer-events: none;
                display: inline-flex;
            }

            .footer {
                margin-top: auto;
                padding: 16px;
            }

            .connect-btn {
                padding: 12px 18px;
            }
        `,
    ]

    protected updated(changedProperties: PropertyValues<this>) {
        super.updated(changedProperties)

        if (
            changedProperties.has('networks') ||
            changedProperties.has('idps')
        ) {
            this.selectedNetwork = this.reconcileSelectedNetwork()
        }
    }

    get selectedIdp(): Idp | null {
        return (
            this.idps.find(
                (idp) => idp.id === this.selectedNetwork?.identityProviderId
            ) ?? null
        )
    }

    private isSelectable(network: PublicNetwork): boolean {
        return network.authMethod !== 'client_credentials'
    }

    // If no network is selected - select first available
    // If network selected, validate that it is in currently available networks
    private reconcileSelectedNetwork(): PublicNetwork | null {
        const selectedId = this.selectedNetwork?.id
        const current = this.networks.find(
            (network) => network.id === selectedId
        )

        if (current && this.isSelectable(current)) {
            return current
        }

        return this.networks.find(this.isSelectable) ?? null
    }

    private get selectedNetworkIndex() {
        if (!this.selectedNetwork) {
            return ''
        }

        const index = this.networks.findIndex(
            (network) => network.id === this.selectedNetwork?.id
        )

        return index >= 0 ? String(index) : ''
    }

    private handleChange(e: Event) {
        const raw = (e.target as HTMLSelectElement).value
        const index = Number.parseInt(raw, 10)

        this.selectedNetwork = Number.isNaN(index)
            ? null
            : (this.networks[index] ?? null)
        this.message = null
    }

    private handleConnect() {
        this.message = null

        if (!this.selectedNetwork) {
            this.messageType = 'error'
            this.message = 'Please select a network before connecting.'
            return
        }

        const idp = this.selectedIdp

        if (!idp) {
            this.messageType = 'error'
            this.message = 'Identity provider misconfigured for this network.'
            return
        }

        let clientId: string | undefined
        let clientSecret: string | undefined
        let username: string | undefined

        if (idp.type === 'self_signed') {
            clientId =
                (
                    this.renderRoot.querySelector(
                        '#client-id'
                    ) as HTMLInputElement | null
                )?.value || this.selectedNetwork.clientId

            clientSecret =
                (
                    this.renderRoot.querySelector(
                        '#client-secret'
                    ) as HTMLInputElement | null
                )?.value ?? ''
        }

        if (idp.type === 'self_issued') {
            username =
                (
                    this.renderRoot.querySelector(
                        '#username'
                    ) as HTMLInputElement | null
                )?.value.trim() ?? ''
        }

        this.dispatchEvent(
            new LoginConnectEvent(
                this.selectedNetwork,
                idp,
                clientId,
                clientSecret,
                username
            )
        )
    }

    private handleSubmit(e: Event) {
        e.preventDefault()
        this.handleConnect()
    }

    /** Set a status message on the form (e.g. "Redirecting...") */
    setMessage(message: string, type: 'error' | 'info') {
        this.message = message
        this.messageType = type
    }

    /** Clear the status message */
    clearMessage() {
        this.message = null
        this.messageType = null
    }

    protected render() {
        const renderAuthSpecificInputs = () => {
            if (
                this.selectedIdp?.type === 'self_issued' ||
                this.selectedNetwork?.authMethod === 'self_issued'
            ) {
                return html`
                    <label
                        class="form-label fw-semibold text-body mt-3 mb-2"
                        for="username"
                        >Username</label
                    >
                    <input
                        id="username"
                        class="login-input form-control"
                        type="text"
                        autocomplete="username"
                        required
                        ?disabled=${this.connecting}
                    />
                `
            }

            if (this.selectedIdp?.type === 'self_signed') {
                return html`
                    <label
                        class="form-label fw-semibold text-body mt-3 mb-2"
                        for="client-id"
                        >Client ID</label
                    >
                    <input
                        id="client-id"
                        class="login-input form-control"
                        type="text"
                        autocomplete="username"
                        .value=${this.selectedNetwork?.clientId || ''}
                        ?disabled=${this.connecting}
                    />
                    <label
                        class="form-label fw-semibold text-body mt-3 mb-2"
                        for="client-secret"
                        >Client Secret</label
                    >
                    <input
                        id="client-secret"
                        class="login-input form-control"
                        type="password"
                        autocomplete="current-password"
                        ?disabled=${this.connecting}
                    />
                `
            }

            return nothing
        }

        return html`
            <form class="screen" @submit=${this.handleSubmit}>
                <div class="top-bar">
                    <img class="top-logo" src=${cantonLogo} alt="Canton logo" />
                </div>

                <div class="content">
                    <div class="title-row">
                        <h3 class="h3 mb-0 fw-bold">Wallet Gateway</h3>
                    </div>

                    <label
                        class="form-label fw-semibold text-body mt-3 mb-2"
                        for="network-select"
                    >
                        Select a network
                    </label>

                    <div class="select-wrap">
                        <select
                            id="network-select"
                            class="network-select form-select"
                            .value=${this.selectedNetworkIndex}
                            @change=${this.handleChange}
                            ?disabled=${this.loading || this.connecting}
                        >
                            <option value="">Select network</option>
                            ${this.networks.map(
                                (net, index) =>
                                    html`<option
                                        value=${index}
                                        ?disabled=${
                                            net.authMethod ===
                                            'client_credentials'
                                        }
                                    >
                                        ${net.name}
                                    </option>`
                            )}
                        </select>
                        <span class="select-chevron">${chevronDownIcon}</span>
                    </div>

                    ${renderAuthSpecificInputs()}
                    ${
                        this.message
                            ? html`<div
                                  class="alert ${
                                      this.messageType === 'error'
                                          ? 'alert-danger'
                                          : 'alert-info'
                                  } py-2 px-3 small mt-2 mb-0"
                                  role="alert"
                              >
                                  ${this.message}
                              </div>`
                            : html`<p
                                  class="form-text text-body-secondary mt-2 mb-0"
                              >
                                  ${
                                      this.loading
                                          ? 'Loading networks...'
                                          : this.selectedNetwork
                                            ? `Selected: ${this.selectedNetwork.name}`
                                            : 'Choose a network to continue.'
                                  }
                              </p>`
                    }
                </div>

                <div class="footer">
                    <button
                        type="submit"
                        class="connect-btn btn btn-primary w-100 rounded-pill"
                        ?disabled=${
                            this.loading ||
                            this.connecting ||
                            !this.selectedNetwork
                        }
                    >
                        ${this.connecting ? 'Connecting…' : 'Connect'}
                    </button>
                </div>
            </form>
        `
    }
}
