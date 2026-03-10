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
    toRelHref,
} from '@canton-network/core-wallet-ui-components'
import { createUserClient } from '../rpc-client'
import { Network, Idp } from '@canton-network/core-wallet-user-rpc-client'
import { stateManager } from '../state-manager'
import '../index'
import {
    AuthTokenProvider,
    ClientCredentials,
} from '@canton-network/core-wallet-auth'
import { redirectToIntendedOrDefault, addUserSession } from '../index'

const PKCE_CODE_VERIFIER_LENGTH = 64

const toBase64Url = (bytes: Uint8Array): string => {
    const binary = String.fromCharCode(...bytes)
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '')
}

const createPkcePair = async (): Promise<{
    verifier: string
    challenge: string
}> => {
    const verifierBytes = crypto.getRandomValues(
        new Uint8Array(PKCE_CODE_VERIFIER_LENGTH)
    )
    const verifier = toBase64Url(verifierBytes)

    const digest = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(verifier)
    )

    return {
        verifier,
        challenge: toBase64Url(new Uint8Array(digest)),
    }
}

@customElement('user-ui-login')
export class LoginUI extends BaseElement {
    @state()
    accessor networks: Network[] = []

    @state()
    accessor idps: Idp[] = []

    @state()
    accessor connecting = false

    @state()
    accessor connectingMessage = 'Connecting...'

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

    private async showLoginError(message: string) {
        this.connecting = false
        await this.updateComplete
        this._loginForm?.setMessage(message, 'error')
    }

    private async handleConnect(e: LoginConnectEvent) {
        const { selectedNetwork, selectedIdp, clientId } = e

        this.connecting = true
        this.connectingMessage = `Connecting to ${selectedNetwork.name}...`
        stateManager.networkId.set(selectedNetwork.id)

        try {
            if (selectedIdp.type === 'self_signed') {
                await this.selfSign({
                    clientId,
                    clientSecret: selectedNetwork.auth.clientSecret || '',
                    scope: selectedNetwork.auth.scope,
                    audience: selectedNetwork.auth.audience,
                } as ClientCredentials)
                redirectToIntendedOrDefault()
                return
            }

            if (selectedIdp.type === 'oauth') {
                if (selectedNetwork.auth.method === 'authorization_code') {
                    const redirectUri = new URL(
                        toRelHref('/callback'),
                        window.location.origin
                    ).toString()

                    const auth = selectedNetwork.auth
                    const config = await fetch(
                        selectedIdp.configUrl || ''
                    ).then((res) => res.json())

                    const statePayload = {
                        configUrl: selectedIdp.configUrl,
                        clientId: auth.clientId,
                        audience: auth.audience,
                        stateId: crypto.randomUUID(),
                    }

                    const { verifier, challenge } = await createPkcePair()
                    sessionStorage.setItem(
                        `oauth-pkce-${statePayload.stateId}`,
                        verifier
                    )

                    const params = new URLSearchParams({
                        response_type: 'code',
                        client_id: auth.clientId || '',
                        redirect_uri: redirectUri,
                        nonce: crypto.randomUUID(),
                        scope: auth.scope || '',
                        audience: auth.audience || '',
                        state: btoa(JSON.stringify(statePayload)),
                        code_challenge: challenge,
                        code_challenge_method: 'S256',
                    })

                    this.connectingMessage = `Redirecting to ${selectedNetwork.name}...`

                    setTimeout(() => {
                        window.location.href = `${config.authorization_endpoint}?${params.toString()}`
                    }, 250)
                    return
                }

                await this.showLoginError(
                    'This authentication method is not valid.'
                )
                return
            }

            await this.showLoginError(
                'This authentication type is not supported yet.'
            )
        } catch (error) {
            this.connecting = false
            handleErrorToast(error)
            await this.updateComplete
            this._loginForm?.setMessage(
                'Unable to connect. Please try again.',
                'error'
            )
        }
    }

    protected async selfSign(credentials: ClientCredentials) {
        const token_provider = new AuthTokenProvider(
            { method: 'self_signed', issuer: 'unsafe-auth', credentials },
            console
        )
        const access_token = await token_provider.getAccessToken()

        const payload = JSON.parse(atob(access_token.split('.')[1]))
        stateManager.expirationDate.set(
            new Date(payload.exp * 1000).toISOString()
        )
        stateManager.accessToken.set(access_token)

        const networkId = stateManager.networkId.get() || ''
        addUserSession(access_token, networkId)
    }

    protected render() {
        if (this.connecting) {
            return html`<wg-loading-state
                .text=${this.connectingMessage}
            ></wg-loading-state>`
        }

        return html`
            <wg-login-form
                .networks=${this.networks}
                .idps=${this.idps}
                .connecting=${this.connecting}
                @login-connect=${this.handleConnect}
            ></wg-login-form>
        `
    }
}
