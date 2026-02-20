// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html } from 'lit'
import { customElement, state } from 'lit/decorators.js'

import '@canton-network/core-wallet-ui-components'
import {
    BaseElement,
    handleErrorToast,
    LoginConnectEvent,
    WgLoginForm,
} from '@canton-network/core-wallet-ui-components'
import { createUserClient } from '../rpc-client'
import { Network, Idp } from '@canton-network/core-wallet-user-rpc-client'
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

    private get _loginForm(): WgLoginForm | null {
        return this.renderRoot.querySelector<WgLoginForm>('wg-login-form')
    }

    private async handleConnect(e: LoginConnectEvent) {
        const { selectedNetwork, selectedIdp, clientId } = e

        stateManager.networkId.set(selectedNetwork.id)

        if (selectedIdp.type === 'self_signed') {
            await this.selfSign({
                clientId: clientId,
                clientSecret: selectedNetwork.auth.clientSecret || '',
                scope: selectedNetwork.auth.scope,
                audience: selectedNetwork.auth.audience,
            } as ClientCredentials)
            redirectToIntendedOrDefault()
        } else if (selectedIdp.type === 'oauth') {
            if (selectedNetwork.auth.method === 'authorization_code') {
                const redirectUri = `${window.origin}/callback/`
                this._loginForm?.setMessage(
                    `Redirecting to ${selectedNetwork.name}...`,
                    'info'
                )

                const auth = selectedNetwork.auth
                const config = await fetch(selectedIdp.configUrl || '').then(
                    (res) => res.json()
                )

                const statePayload = {
                    configUrl: selectedIdp.configUrl,
                    clientId: auth.clientId,
                    audience: auth.audience,
                }

                const params = new URLSearchParams({
                    response_type: 'code',
                    client_id: selectedNetwork.auth.clientId || '',
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
                this._loginForm?.setMessage(
                    'This authentication method is not valid.',
                    'error'
                )
            }
        } else {
            this._loginForm?.setMessage(
                'This authentication type is not supported yet.',
                'error'
            )
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
            <wg-login-form
                .networks=${this.networks}
                .idps=${this.idps}
                @login-connect=${this.handleConnect}
            ></wg-login-form>
        `
    }
}
