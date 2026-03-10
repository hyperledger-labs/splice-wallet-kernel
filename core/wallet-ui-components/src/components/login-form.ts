// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html, PropertyValues } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element.js'
import { Network, Idp } from '@canton-network/core-wallet-user-rpc-client'
import { toRelPath } from '../routing'
import { arrowLeftIcon, chevronDownIcon } from '../icons'
import cantonLogo from '../../images/logos/canton-logo.png'

/** Emitted when the user clicks the Connect button */
export class LoginConnectEvent extends Event {
    constructor(
        public selectedNetwork: Network,
        public selectedIdp: Idp,
        public clientId: string
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
    @property({ type: Array }) networks: Network[] = []

    /** Available identity providers */
    @property({ type: Array }) idps: Idp[] = []

    @property({ type: Boolean }) connecting = false
    @property({ type: String }) backHref = '/'

    @state() accessor selectedNetwork: Network | null = null
    @state() accessor selectedIdp: Idp | null = null
    @state() accessor message: string | null = null
    @state() accessor messageType: 'error' | 'info' | null = null

    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: block;
                min-height: 100dvh;
                background: #efefef;
                color: #222;
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

            .title {
                margin: 0;
                font-size: 32px;
                line-height: 1.1;
                font-weight: 700;
                color: #1f2937;
                letter-spacing: -0.02em;
            }

            .back-link {
                border: none;
                background: transparent;
                color: #111827;
                font-size: 16px;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                cursor: pointer;
                white-space: nowrap;
                padding: 0;
            }

            .back-link-icon {
                color: #7c3aed;
                display: inline-flex;
            }

            .gateway-row {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                font-size: 24px;
                color: #222;
            }

            .gateway-badge {
                width: 24px;
                height: 24px;
                border-radius: 4px;
                background: #000;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                flex: 0 0 auto;
            }

            .gateway-badge img {
                width: 16px;
                height: 16px;
                object-fit: contain;
                display: block;
            }

            .field-label {
                display: block;
                margin: 10px 0 6px;
                font-size: 14px;
                font-weight: 700;
                color: #222;
                letter-spacing: 0.04em;
                text-transform: uppercase;
            }

            .select-wrap {
                position: relative;
            }

            .network-select,
            .client-id-input {
                width: 100%;
                border: 1px solid #d4d4d8;
                border-radius: 4px;
                background: #dedede;
                color: #303030;
                padding: 12px 40px 12px 14px;
                font-size: 20px;
                line-height: 1.2;
                outline: none;
                appearance: none;
            }

            .network-select:focus,
            .client-id-input:focus {
                border-color: #a3a3a3;
                box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.1);
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

            .message {
                margin-top: 6px;
                border-radius: 4px;
                padding: 8px 10px;
                font-size: 15px;
            }

            .message.error {
                background: rgba(239, 68, 68, 0.14);
                color: #b91c1c;
            }

            .message.info {
                background: rgba(124, 58, 237, 0.1);
                color: #5b21b6;
            }

            .hint {
                margin: 6px 0 0;
                color: #555;
                font-size: 14px;
            }

            .footer {
                margin-top: auto;
                padding: 16px;
            }

            .connect-btn {
                width: 100%;
                border: none;
                border-radius: 999px;
                padding: 12px 18px;
                background: var(--wg-primary, #000000);
                color: var(--wg-primary-text, #ffffff);
                font-size: 30px;
                font-weight: 500;
                line-height: 1.1;
                cursor: pointer;
                transition: background-color 0.2s ease;
            }

            .connect-btn:hover:not(:disabled) {
                background: var(--wg-primary-hover, #363636);
            }

            .connect-btn:disabled {
                opacity: 0.7;
                cursor: not-allowed;
            }

            @media (max-width: 720px) {
                .title {
                    font-size: 30px;
                }

                .gateway-row {
                    font-size: 20px;
                }

                .field-label {
                    font-size: 13px;
                }

                .network-select,
                .client-id-input {
                    font-size: 18px;
                }

                .message {
                    font-size: 14px;
                }

                .hint {
                    font-size: 13px;
                }

                .connect-btn {
                    font-size: 28px;
                }
            }
        `,
    ]

    protected updated(changedProperties: PropertyValues<this>) {
        super.updated(changedProperties)

        if (changedProperties.has('networks') && !this.selectedNetwork) {
            const index = this.networks.findIndex(
                (network) => network.auth.method !== 'client_credentials'
            )

            if (index >= 0) {
                this.selectedNetwork = this.networks[index]
                this.selectedIdp =
                    this.idps.find(
                        (idp) =>
                            idp.id === this.selectedNetwork?.identityProviderId
                    ) ?? null
            }
        }
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

        if (Number.isNaN(index)) {
            this.selectedNetwork = null
            this.selectedIdp = null
            this.message = null
            return
        }

        this.selectedNetwork = this.networks[index] ?? null
        this.selectedIdp =
            this.idps.find(
                (idp) => idp.id === this.selectedNetwork?.identityProviderId
            ) ?? null
        this.message = null
    }

    private handleConnect() {
        this.message = null

        if (!this.selectedNetwork) {
            this.messageType = 'error'
            this.message = 'Please select a network before connecting.'
            return
        }

        const idp = this.idps.find(
            (candidate) =>
                candidate.id === this.selectedNetwork?.identityProviderId
        )

        if (!idp) {
            this.messageType = 'error'
            this.message = 'Identity provider misconfigured for this network.'
            return
        }

        const clientId =
            (
                this.renderRoot.querySelector(
                    '#client-id'
                ) as HTMLInputElement | null
            )?.value || this.selectedNetwork.auth.clientId

        this.dispatchEvent(
            new LoginConnectEvent(this.selectedNetwork, idp, clientId)
        )
    }

    private handleBack() {
        const event = new LoginBackEvent()
        const shouldContinue = this.dispatchEvent(event)

        if (shouldContinue) {
            window.location.href = toRelPath(this.backHref)
        }
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
        return html`
            <main class="screen">
                <div class="top-bar">
                    <img class="top-logo" src=${cantonLogo} alt="Canton logo" />
                </div>

                <div class="content">
                    <div class="title-row">
                        <h1 class="title">Wallet Gateway</h1>
                        <button class="back-link" @click=${this.handleBack}>
                            <span class="back-link-icon">${arrowLeftIcon}</span>
                            Back
                        </button>
                    </div>

                    <!-- <div class="gateway-row" aria-hidden="true"> -->
                    <!--     <span class="gateway-badge"> -->
                    <!--         <img src=${cantonLogo} alt="" /> -->
                    <!--     </span> -->
                    <!--     Wallet Gateway -->
                    <!-- </div> -->

                    <label class="field-label" for="network-select">
                        Select a network
                    </label>

                    <div class="select-wrap">
                        <select
                            id="network-select"
                            class="network-select"
                            .value=${this.selectedNetworkIndex}
                            @change=${this.handleChange}
                            ?disabled=${this.connecting}
                        >
                            <option value="">Select network</option>
                            ${this.networks.map(
                                (net, index) =>
                                    html`<option
                                        value=${index}
                                        ?disabled=${net.auth.method ===
                                        'client_credentials'}
                                    >
                                        ${net.name}
                                    </option>`
                            )}
                        </select>
                        <span class="select-chevron">${chevronDownIcon}</span>
                    </div>

                    ${this.selectedIdp?.type === 'self_signed'
                        ? html`
                              <label class="field-label" for="client-id"
                                  >Client ID</label
                              >
                              <input
                                  id="client-id"
                                  class="client-id-input"
                                  type="text"
                                  .value=${this.selectedNetwork?.auth
                                      .clientId || ''}
                                  ?disabled=${this.connecting}
                              />
                          `
                        : null}
                    ${this.message
                        ? html`<div class="message ${this.messageType}">
                              ${this.message}
                          </div>`
                        : html`<p class="hint">
                              ${this.selectedNetwork
                                  ? `Selected: ${this.selectedNetwork.name}`
                                  : 'Choose a network to continue.'}
                          </p>`}
                </div>

                <div class="footer">
                    <button
                        class="connect-btn"
                        @click=${this.handleConnect}
                        ?disabled=${this.connecting || !this.selectedNetwork}
                    >
                        ${this.connecting ? 'Connecting…' : 'Connect'}
                    </button>
                </div>
            </main>
        `
    }
}
