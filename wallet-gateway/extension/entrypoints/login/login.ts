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
} from '@canton-network/core-wallet-ui-components'
import { createUserClient } from '@/utils/legacy-frontend/rpc-client'
import type {
    PublicNetwork,
    Idp,
} from '@canton-network/core-wallet-user-rpc-client'
import { stateManager } from '@/utils/legacy-frontend/state-manager'
import '@/utils/legacy-frontend'
import {
    redirectToIntendedOrDefault,
    addUserSession,
} from '@/utils/legacy-frontend'
import { detectCurrentOrigin } from '@/utils/legacy-frontend/listeners.js'
import { buildAuthorization, fetchToken } from '@/utils/reusable/oauth'
import { jwtExpiresAt } from '@canton-network/core-wallet-auth'

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
            (await stateManager.accessToken.get(currentOrigin)) || undefined
        )
        const response = await userClient.request({ method: 'listNetworks' })
        return response.networks
    }

    private async loadIdps() {
        const currentOrigin = await detectCurrentOrigin()
        const userClient = await createUserClient(
            (await stateManager.accessToken.get(currentOrigin)) || undefined
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
        const { selectedNetwork, selectedIdp, clientId, clientSecret } = e

        this.connecting = true
        this.connectingMessage = `Connecting to ${selectedNetwork.name}...`
        const currentOrigin = await detectCurrentOrigin()
        await stateManager.networkId.set(selectedNetwork.id, currentOrigin)

        try {
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
                    const redirectUri = browser.identity.getRedirectURL()

                    const authUrl = await buildAuthorization({
                        configUrl: selectedIdp.configUrl || '',
                        clientId: selectedNetwork.clientId || '',
                        audience: selectedNetwork.audience || '',
                        scope: selectedNetwork.scope || '',
                        redirectUri,
                    })

                    logger.info('Launching web auth flow with URL: ' + authUrl)

                    const callbackUri =
                        await browser.identity.launchWebAuthFlow({
                            url: authUrl,
                            interactive: true,
                        })

                    const token = await fetchToken(callbackUri, redirectUri)
                    await stateManager.expirationDate.set(
                        jwtExpiresAt(token).toISOString(),
                        currentOrigin
                    )

                    await stateManager.accessToken.set(token, currentOrigin)
                    const networkId =
                        await stateManager.networkId.get(currentOrigin)

                    await addUserSession(token, networkId || '')
                    await redirectToIntendedOrDefault()
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
            (await stateManager.accessToken.get(currentOrigin)) || undefined
        )
        const { accessToken } = await userClient.request({
            method: 'selfSignedAccessToken',
            params: { networkId, clientId, clientSecret },
        })

        await stateManager.expirationDate.set(
            jwtExpiresAt(accessToken).toISOString(),
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
