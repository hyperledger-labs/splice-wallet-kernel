// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html } from 'lit'
import { customElement, state } from 'lit/decorators.js'

import '@canton-network/core-wallet-ui-components'
import {
    BaseElement,
    handleErrorToast,
    type LoginConnectEvent,
    type WgLoginForm,
    toRelHref,
} from '@canton-network/core-wallet-ui-components'
import { createUserClient } from '../rpc-client'
import type {
    PublicNetwork,
    Idp,
} from '@canton-network/core-wallet-user-rpc-client'
import { stateManager } from '../state-manager'
import '../index'
import { redirectToIntendedOrDefault, addUserSession } from '../index'
import { setLocationHref } from '../navigation.js'
import { detectCurrentOrigin } from '../listeners.js'

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
    accessor networks: PublicNetwork[] = []

    @state()
    accessor idps: Idp[] = []

    @state()
    accessor loading = true

    @state()
    accessor connecting = false

    @state()
    accessor connectingMessage = 'Connecting...'

    private async loadNetworks() {
        const currentOrigin = await detectCurrentOrigin()
        const userClient = await createUserClient(
            await stateManager.accessToken.get(currentOrigin)
        )
        const response = await userClient.request({ method: 'listNetworks' })
        return response.networks
    }

    private async loadIdps() {
        const currentOrigin = await detectCurrentOrigin()
        const userClient = await createUserClient(
            await stateManager.accessToken.get(currentOrigin)
        )
        const response = await userClient.request({ method: 'listIdps' })
        return response.idps
    }

    async connectedCallback() {
        super.connectedCallback()
        try {
            // Connecting needs both, so fetch them together and publish them update once both are resolved

            const [networks, idps] = await Promise.all([
                this.loadNetworks(),
                this.loadIdps(),
            ])
            this.networks = networks
            this.idps = idps
        } catch (e) {
            handleErrorToast(e)
        } finally {
            this.loading = false
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
        const {
            selectedNetwork,
            selectedIdp,
            clientId,
            clientSecret,
            username,
        } = e

        this.connecting = true
        this.connectingMessage = `Connecting to ${selectedNetwork.name}...`
        const currentOrigin = await detectCurrentOrigin()
        stateManager.networkId.set(selectedNetwork.id, currentOrigin)

        try {
            if (selectedNetwork.authMethod === 'self_issued') {
                const onboardingUsername = username?.trim()
                if (!onboardingUsername) {
                    await this.showLoginError('Username is required.')
                    return
                }

                const userClient = await createUserClient()
                const { sessionId } = await userClient.request({
                    method: 'startSelfIssuedLoginSession',
                    params: {
                        username: onboardingUsername,
                        networkId: selectedNetwork.id,
                        origin: currentOrigin,
                    },
                })
                stateManager.selfIssuedLoginSessionId.set(
                    sessionId,
                    currentOrigin
                )

                setLocationHref(
                    new URL(
                        toRelHref('/self-issued-login'),
                        window.location.origin
                    ).toString()
                )
                return
            }

            if (selectedIdp.type === 'self_signed') {
                await this.selfSign(
                    selectedNetwork.id,
                    clientId ?? '',
                    clientSecret ?? ''
                )
                await redirectToIntendedOrDefault()
                return
            }

            if (selectedIdp.type === 'oauth') {
                if (selectedNetwork.authMethod === 'authorization_code') {
                    const redirectUri = new URL(
                        toRelHref('/callback'),
                        window.location.origin
                    ).toString()

                    const config = await fetch(
                        selectedIdp.configUrl || ''
                    ).then((res) => res.json())

                    const statePayload = {
                        configUrl: selectedIdp.configUrl,
                        clientId: selectedNetwork.clientId,
                        audience: selectedNetwork.audience,
                        stateId: crypto.randomUUID(),
                    }

                    const { verifier, challenge } = await createPkcePair()
                    sessionStorage.setItem(
                        `oauth-pkce-${statePayload.stateId}`,
                        verifier
                    )

                    const params = new URLSearchParams({
                        response_type: 'code',
                        client_id: selectedNetwork.clientId || '',
                        redirect_uri: redirectUri,
                        nonce: crypto.randomUUID(),
                        scope: selectedNetwork.scope || '',
                        audience: selectedNetwork.audience || '',
                        state: btoa(JSON.stringify(statePayload)),
                        code_challenge: challenge,
                        code_challenge_method: 'S256',
                    })

                    this.connectingMessage = `Redirecting to ${selectedNetwork.name}...`

                    setTimeout(() => {
                        setLocationHref(
                            `${config.authorization_endpoint}?${params.toString()}`
                        )
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

    protected async selfSign(
        networkId: string,
        clientId: string,
        clientSecret: string
    ) {
        const currentOrigin = await detectCurrentOrigin()
        const userClient = await createUserClient(
            await stateManager.accessToken.get(currentOrigin)
        )
        const { accessToken } = await userClient.request({
            method: 'selfSignedAccessToken',
            params: { networkId, clientId, clientSecret },
        })

        const payload = JSON.parse(atob(accessToken.split('.')[1]))
        stateManager.expirationDate.set(
            new Date(payload.exp * 1000).toISOString(),
            currentOrigin
        )
        await stateManager.accessToken.set(accessToken, currentOrigin)

        await addUserSession(accessToken, networkId)
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
                .loading=${this.loading}
                .connecting=${this.connecting}
                @login-connect=${this.handleConnect}
            ></wg-login-form>
        `
    }
}
