// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LitElement, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { stateManager } from '../state-manager'
import { addUserSession, redirectToIntendedOrDefault } from '..'
import {
    handleErrorToast,
    toRelHref,
} from '@canton-network/core-wallet-ui-components'
import { detectCurrentOrigin } from '../listeners'
import { LOGIN_PAGE_REDIRECT } from '../constants'
import {
    fetchOidcDiscovery,
    jwtExpiresAt,
    oidcTokenResponseSchema,
    parseIdpResponse,
} from '@canton-network/core-wallet-auth'

@customElement('login-callback')
export class LoginCallback extends LitElement {
    @state() accessor hasError = false

    connectedCallback(): void {
        super.connectedCallback()
        void this.handleRedirect()
    }

    async handleRedirect() {
        try {
            const url = new URL(window.location.href)
            const code = url.searchParams.get('code')
            const encodedState = url.searchParams.get('state')

            if (!code || !encodedState) {
                throw new Error('Missing state or code in OAuth callback')
            }

            const state = JSON.parse(atob(encodedState))
            const pkceVerifier = sessionStorage.getItem(
                `oauth-pkce-${state.stateId}`
            )

            if (!pkceVerifier) {
                throw new Error(
                    'Missing PKCE verifier for OAuth callback state'
                )
            }

            sessionStorage.removeItem(`oauth-pkce-${state.stateId}`)

            const config = await fetchOidcDiscovery(state.configUrl)
            if (!config.token_endpoint) {
                throw new Error('OIDC discovery document has no token_endpoint')
            }
            const redirectUri = new URL(
                toRelHref('/callback'),
                window.location.origin
            ).toString()

            const res = await fetch(config.token_endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json',
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: redirectUri,
                    client_id: state.clientId,
                    audience: state.audience,
                    code_verifier: pkceVerifier,
                }),
            })

            if (!res.ok) {
                throw new Error(`OAuth token request failed: ${res.status}`)
            }
            const tokenResponse = parseIdpResponse(
                oidcTokenResponseSchema,
                await res.json(),
                'OAuth token response'
            )

            const currentOrigin = await detectCurrentOrigin()

            stateManager.expirationDate.set(
                jwtExpiresAt(tokenResponse.access_token).toISOString(),
                currentOrigin
            )

            await stateManager.accessToken.set(
                tokenResponse.access_token,
                currentOrigin
            )

            await addUserSession(
                tokenResponse.access_token,
                stateManager.networkId.get(currentOrigin) || ''
            )
            await redirectToIntendedOrDefault()
        } catch (error) {
            this.hasError = true
            handleErrorToast(error)
        }
    }

    render() {
        if (this.hasError) {
            return html`<wg-error-page
                title="Login failed"
                message="We could not complete your login. Return to network selection and try again."
                .backHref=${LOGIN_PAGE_REDIRECT}
            ></wg-error-page>`
        }

        return html`<wg-loading-state
            .text=${'Logging in...'}
        ></wg-loading-state>`
    }
}
