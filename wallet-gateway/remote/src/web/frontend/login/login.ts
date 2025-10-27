// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, css, LitElement } from 'lit'
import { customElement, state } from 'lit/decorators.js'

import '@canton-network/core-wallet-ui-components'
import { createUserClient } from '../rpc-client'
import { Network } from '@canton-network/core-wallet-user-rpc-client'
import { stateManager } from '../state-manager'
import '../index'
import { WalletEvent } from '@canton-network/core-types'
import { ClientCredentials } from '@canton-network/core-wallet-auth'
import { fetchToken } from './self-signed-service'

@customElement('user-ui-login')
export class LoginUI extends LitElement {
    @state()
    accessor idps: Network[] = []

    @state()
    accessor selectedNetwork: Network | null = null

    @state()
    accessor message: string | null = null

    @state()
    accessor messageType: 'error' | 'info' | null = null

    static styles = css`
        :host {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            padding: 1.5rem;
            box-sizing: border-box;
            color: var(--text-color, #222);
            background: transparent;
        }

        :host([theme='dark']) {
            --card-bg: #1e1e1e;
            --text-color: #fff;
            --border-color: #333;
            --button-bg: #4caf50;
            --button-hover: #66bb6a;
            --error-color: #ff6b6b;
            --info-color: #81c784;
        }

        :host(:not([theme='dark'])) {
            --card-bg: #fff;
            --border-color: #ddd;
            --button-bg: #4caf50;
            --button-hover: #43a047;
            --error-color: #d32f2f;
            --info-color: #388e3c;
        }

        .card {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            padding: 1.5rem;
            width: 100%;
            max-width: 360px;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            text-align: center;
            box-sizing: border-box;
        }

        h1 {
            font-size: 1.25rem;
            margin: 0.25rem 0 0.5rem 0;
        }

        select {
            appearance: none;
            padding: 0.6rem 0.75rem;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            background: var(--card-bg);
            color: var(--text-color);
            font-size: 1rem;
            cursor: pointer;
            outline: none;
            transition: border 0.2s ease;
            width: 100%;
            box-sizing: border-box;
        }

        select:focus {
            border-color: #4caf50;
        }

        button {
            padding: 0.7rem;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            background: var(--button-bg);
            color: white;
            font-weight: 600;
            font-size: 1rem;
            transition: background 0.2s ease;
            width: 100%;
        }

        button:hover {
            background: var(--button-hover);
        }

        .message {
            font-size: 0.85rem;
            border-radius: 6px;
            padding: 0.5rem;
            text-align: center;
            transition: opacity 0.2s ease;
        }

        .message.error {
            color: var(--error-color);
            background-color: color-mix(
                in srgb,
                var(--error-color) 10%,
                transparent
            );
        }

        .message.info {
            color: var(--info-color);
            background-color: color-mix(
                in srgb,
                var(--info-color) 10%,
                transparent
            );
        }

        p {
            font-size: 0.85rem;
            color: var(--text-color);
            opacity: 0.8;
            margin-top: 0.25rem;
        }

        @media (max-width: 480px) {
            .card {
                border-radius: 12px;
                padding: 1.25rem;
                gap: 0.75rem;
            }

            h1 {
                font-size: 1.1rem;
            }

            button,
            select {
                font-size: 0.95rem;
            }
        }
    `

    private handleChange(e: Event) {
        const index = parseInt((e.target as HTMLSelectElement).value)
        this.selectedNetwork = this.idps[index] ?? null
        this.message = null
    }

    private async loadNetworks() {
        const userClient = createUserClient(stateManager.accessToken.get())
        const response = await userClient.request('listNetworks')
        return response.networks
    }

    async connectedCallback() {
        super.connectedCallback()
        this.idps = await this.loadNetworks()
    }

    private async handleConnectToIDP() {
        this.message = null

        if (!this.selectedNetwork) {
            this.messageType = 'error'
            this.message = 'Please select a network before connecting.'
            return
        }

        stateManager.chainId.set(this.selectedNetwork.chainId)
        const redirectUri = `${window.origin}/callback/`

        if (this.selectedNetwork.auth.type === 'implicit') {
            this.messageType = 'info'
            this.message = `Redirecting to ${this.selectedNetwork.name}...`

            const auth = this.selectedNetwork.auth
            const config = await fetch(auth.configUrl).then((res) => res.json())

            const statePayload = {
                configUrl: auth.configUrl,
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
        } else if (this.selectedNetwork.auth.type === 'self_signed') {
            await this.selfSign({
                clientId: this.selectedNetwork.auth.clientId || '',
                clientSecret: this.selectedNetwork.auth.clientSecret || '',
                scope: this.selectedNetwork.auth.scope,
                audience: this.selectedNetwork.auth.audience,
            } as ClientCredentials)
            setTimeout(() => {
                window.location.replace('/')
            }, 400)
        } else {
            this.messageType = 'error'
            this.message = 'This authentication type is not supported yet.'
        }
    }

    protected async selfSign(credentials: ClientCredentials) {
        const access_token = await fetchToken(credentials)

        if (window.opener && !window.opener.closed) {
            window.opener.postMessage(
                {
                    type: WalletEvent.SPLICE_WALLET_IDP_AUTH_SUCCESS,
                    token: access_token,
                },
                '*'
            )
        }

        const payload = JSON.parse(atob(access_token.split('.')[1]))
        stateManager.expirationDate.set(new Date(payload.exp * 1000).toString())

        stateManager.accessToken.set(access_token)

        const authenticatedUserClient = createUserClient(access_token)

        await authenticatedUserClient.request('addSession', {
            chainId: stateManager.chainId.get() || '',
        })
    }

    protected render() {
        return html`
            <div class="card">
                <h1>Sign in to Canton Network</h1>

                <select id="network" @change=${this.handleChange}>
                    <option value="">Select Network</option>
                    ${this.idps.map(
                        (net, index) =>
                            html`<option
                                value=${index}
                                ?disabled=${net.auth.type ==
                                    'client_credentials' ||
                                net.auth.type == 'password'}
                            >
                                ${net.name}
                            </option>`
                    )}
                </select>

                <button @click=${this.handleConnectToIDP}>Connect</button>

                ${this.message
                    ? html`<div class="message ${this.messageType}">
                          ${this.message}
                      </div>`
                    : html`<p>
                          ${this.selectedNetwork
                              ? `Selected: ${this.selectedNetwork.name}`
                              : `Please choose a network`}
                      </p>`}
            </div>
        `
    }
}
