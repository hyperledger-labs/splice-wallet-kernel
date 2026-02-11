// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, css } from 'lit'
import { customElement, state } from 'lit/decorators.js'

import '@canton-network/core-wallet-ui-components'
import {
    BaseElement,
    handleErrorToast,
} from '@canton-network/core-wallet-ui-components'
import { createUserClient } from '../rpc-client'
import { Idp, Network } from '@canton-network/core-wallet-user-rpc-client'
import { stateManager } from '../state-manager'
import '../index'
import {
    AuthTokenProviderSelfSigned,
    ClientCredentials,
} from '@canton-network/core-wallet-auth'
import { redirectToIntendedOrDefault, addUserSession } from '../index'

@customElement('user-ui-login')
export class LoginUI extends BaseElement {
    @state()
    accessor networks: Network[] = []

    @state()
    accessor idps: Idp[] = []

    @state()
    accessor selectedNetwork: Network | null = null

    @state()
    accessor selectedIdp: Idp | null = null

    @state()
    accessor message: string | null = null

    @state()
    accessor messageType: 'error' | 'info' | null = null

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

    private async loadNetworks() {
        const userClient = await createUserClient(
            stateManager.accessToken.get()
        )
        const response = await userClient.request({ method: 'listNetworks' })
        return response.networks
    }

    private async loadIdps() {
        const userClient = await createUserClient(
            stateManager.accessToken.get()
        )
        const response = await userClient.request({ method: 'listIdps' })
        return response.idps
    }

    async connectedCallback() {
        super.connectedCallback()
        try {
            this.networks = await this.loadNetworks()
            this.idps = await this.loadIdps()
        } catch (e) {
            handleErrorToast(e)
        }
    }

    private async handleConnectToIDP() {
        this.message = null

        if (!this.selectedNetwork) {
            this.messageType = 'error'
            this.message = 'Please select a network before connecting.'
            return
        }

        const clientId =
            (this.renderRoot.querySelector('#client-id') as HTMLInputElement)
                ?.value || this.selectedNetwork.auth.clientId

        stateManager.networkId.set(this.selectedNetwork.id)
        const idp = this.idps.find(
            (idp) => idp.id === this.selectedNetwork?.identityProviderId
        )

        if (!idp) {
            this.messageType = 'error'
            this.message = 'Identity provider misconfigured for this network.'
            return
        }

        if (idp.type === 'self_signed') {
            await this.selfSign({
                clientId: clientId,
                clientSecret: this.selectedNetwork.auth.clientSecret || '',
                scope: this.selectedNetwork.auth.scope,
                audience: this.selectedNetwork.auth.audience,
            } as ClientCredentials)
            redirectToIntendedOrDefault()
        } else if (idp.type === 'oauth') {
            if (this.selectedNetwork.auth.method === 'authorization_code') {
                const redirectUri = `${window.origin}/callback/`
                this.messageType = 'info'
                this.message = `Redirecting to ${this.selectedNetwork.name}...`

                const auth = this.selectedNetwork.auth
                const config = await fetch(idp.configUrl || '').then((res) =>
                    res.json()
                )

                const statePayload = {
                    configUrl: idp.configUrl,
                    clientId: auth.clientId,
                    audience: auth.audience,
                }

                const params = new URLSearchParams({
                    response_type: 'code',
                    client_id: this.selectedNetwork.auth.clientId || '',
                    redirect_uri: redirectUri || '',
                    nonce: crypto.randomUUID(),
                    scope: auth.scope || '',
                    audience: auth.audience || '',
                    state: btoa(JSON.stringify(statePayload)),
                })

                // small delay to allow message to appear
                setTimeout(() => {
                    window.location.href = `${config.authorization_endpoint}?${params.toString()}`
                }, 400)
            } else {
                this.messageType = 'error'
                this.message = 'This authentication method is not valid.'
                return
            }
        } else {
            this.messageType = 'error'
            this.message = 'This authentication type is not supported yet.'
        }
    }

    protected async selfSign(credentials: ClientCredentials) {
        const access_token = await AuthTokenProviderSelfSigned.fetchToken(
            console,
            credentials,
            'unsafe-auth',
            3600
        )

        const payload = JSON.parse(atob(access_token.split('.')[1]))
        stateManager.expirationDate.set(
            new Date(payload.exp * 1000).toISOString()
        )
        stateManager.accessToken.set(access_token)

        const networkId = stateManager.networkId.get() || ''
        addUserSession(access_token, networkId)
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
                        @click=${this.handleConnectToIDP}
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
