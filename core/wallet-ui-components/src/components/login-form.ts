// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element.js'
import { Network, Idp } from '@canton-network/core-wallet-user-rpc-client'

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

@customElement('wg-login-form')
export class WgLoginForm extends BaseElement {
    /** Available networks to show in the dropdown */
    @property({ type: Array }) networks: Network[] = []

    /** Available identity providers */
    @property({ type: Array }) idps: Idp[] = []

    @state() accessor selectedNetwork: Network | null = null
    @state() accessor selectedIdp: Idp | null = null
    @state() accessor message: string | null = null
    @state() accessor messageType: 'error' | 'info' | null = null

    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                padding: 1.5rem;
                box-sizing: border-box;
                background: transparent;
            }
        `,
    ]

    private handleChange(e: Event) {
        const index = parseInt((e.target as HTMLSelectElement).value)
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
            (idp) => idp.id === this.selectedNetwork?.identityProviderId
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
            <div class="card shadow" style="max-width: 360px;">
                <div class="card-body d-flex flex-column gap-3 text-center">
                    <h1 class="card-title h5">Sign in to Canton Network</h1>

                    <select
                        id="network"
                        class="form-select"
                        @change=${this.handleChange}
                    >
                        <option value="">Select Network</option>
                        ${this.networks.map(
                            (net, index) =>
                                html`<option
                                    value=${index}
                                    ?disabled=${net.auth.method ==
                                    'client_credentials'}
                                >
                                    ${net.name}
                                </option>`
                        )}
                    </select>

                    ${this.selectedIdp?.type === 'self_signed'
                        ? html`
                              <input
                                  type="text"
                                  class="form-control"
                                  title="client id"
                                  id="client-id"
                                  .value=${this.selectedNetwork?.auth
                                      .clientId || ''}
                              />
                          `
                        : null}
                    <button
                        class="btn btn-primary w-100"
                        @click=${this.handleConnect}
                    >
                        Connect
                    </button>

                    ${this.message
                        ? html`<div
                              class="alert ${this.messageType === 'error'
                                  ? 'alert-danger'
                                  : 'alert-success'} py-2"
                          >
                              ${this.message}
                          </div>`
                        : html`<p class="text-body-secondary small mb-0">
                              ${this.selectedNetwork
                                  ? `Selected: ${this.selectedNetwork.name}`
                                  : `Please choose a network`}
                          </p>`}
                </div>
            </div>
        `
    }
}
