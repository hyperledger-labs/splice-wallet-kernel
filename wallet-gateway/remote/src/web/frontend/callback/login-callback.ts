// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { WalletEvent } from '@canton-network/core-types'
import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'
import { stateManager } from '../state-manager'
import { createUserClient } from '../rpc-client'

@customElement('login-callback')
export class LoginCallback extends LitElement {
    connectedCallback(): void {
        super.connectedCallback()
        this.handleRedirect()
    }

    async handleRedirect() {
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')
        const encodedState = url.searchParams.get('state')

        if (!code && !encodedState) {
            console.error('missing state and code')
            return
        }

        if (code && encodedState) {
            const state = JSON.parse(atob(encodedState))
            const fetchConfig = await fetch(state.configUrl)
            const config = await fetchConfig.json()
            const tokenEndpoint = config.token_endpoint

            const res = await fetch(tokenEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: window.location.origin + '/callback/',
                    client_id: state.clientId,
                    audience: state.audience,
                }),
            })

            const tokenResponse = await res.json()

            if (tokenResponse.access_token) {
                if (window.opener && !window.opener.closed) {
                    window.opener.postMessage(
                        {
                            type: WalletEvent.SPLICE_WALLET_IDP_AUTH_SUCCESS,
                            token: tokenResponse.access_token,
                        },
                        '*'
                    )
                }

                const payload = JSON.parse(
                    atob(tokenResponse.access_token.split('.')[1])
                )
                stateManager.expirationDate.set(
                    new Date(payload.exp * 1000).toString()
                )

                stateManager.accessToken.set(tokenResponse.access_token)

                const authenticatedUserClient = createUserClient(
                    tokenResponse.access_token
                )

                await authenticatedUserClient.request('addSession', {
                    chainId: stateManager.chainId.get() || '',
                })

                window.location.replace('/')
            }
        }
    }

    render() {
        return html`<h2>Logged in!</h2>`
    }
}
