// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, LitElement } from 'lit'
import { customElement } from 'lit/decorators.js'
import { createUserClient } from './rpc-client'

import '@canton-network/core-wallet-ui-components'
import '@canton-network/core-wallet-ui-components/dist/index.css'
import '/index.css'
import { stateManager } from './state-manager'
import { WalletEvent } from '@canton-network/core-types'

export const DEFAULT_PAGE_REDIRECT = '/wallets'
const NOT_FOUND_PAGE_REDIRECT = '/404'
const LOGIN_PAGE_REDIRECT = '/login'
const ALLOWED_ROUTES = [
    '/login/',
    '/wallets/',
    '/settings/',
    '/transactions/',
    '/approve/',
    '/',
]

@customElement('user-app')
export class UserApp extends LitElement {
    private async handleLogout() {
        localStorage.clear()

        const userClient = await createUserClient(
            stateManager.accessToken.get()
        )
        await userClient.request('removeSession')

        if (window.opener && !window.opener.closed) {
            // close the gateway UI automatically if we are within a popup
            window.close()
        } else {
            // if the gateway UI is running in the main window, redirect to login
            window.location.href = LOGIN_PAGE_REDIRECT
        }
    }

    protected render() {
        return html`
            <app-layout iconSrc="/icon.png" @logout=${this.handleLogout}>
                <user-ui-auth-redirect></user-ui-auth-redirect>
                <slot></slot>
            </app-layout>
        `
    }
}

@customElement('user-ui')
export class UserUI extends LitElement {
    connectedCallback(): void {
        super.connectedCallback()

        if (!ALLOWED_ROUTES.includes(window.location.pathname)) {
            window.location.href = NOT_FOUND_PAGE_REDIRECT
        }
    }
}

@customElement('user-ui-auth-redirect')
export class UserUIAuthRedirect extends LitElement {
    connectedCallback(): void {
        super.connectedCallback()

        const isLoginPage =
            window.location.pathname.startsWith(LOGIN_PAGE_REDIRECT)
        const expirationDate = new Date(stateManager.expirationDate.get() || '')
        const now = new Date()

        if (expirationDate > now) {
            setTimeout(() => {
                localStorage.clear()
                window.location.href = LOGIN_PAGE_REDIRECT
            }, expirationDate.getTime() - now.getTime())
        } else if (stateManager.accessToken.get()) {
            localStorage.clear()
            window.location.href = LOGIN_PAGE_REDIRECT
        }

        if (!stateManager.accessToken.get() && !isLoginPage) {
            window.location.href = LOGIN_PAGE_REDIRECT
        }

        const accessToken = stateManager.accessToken.get()

        if (accessToken) {
            const networkId = stateManager.networkId.get()

            if (!networkId) {
                throw new Error('missing networkId in state manager')
            }

            // Verify that the access token is still valid by making a simple RPC call
            createUserClient(accessToken)
                .then((client) => {
                    return client.request('listSessions') // todo: make private getSession endpoint
                })
                .then((sessions) => {
                    // Token is valid - redirect to default page if on login page
                    if (isLoginPage || window.location.pathname === '/') {
                        window.location.href = DEFAULT_PAGE_REDIRECT
                    }

                    // Share the connection with the opener window if it exists
                    const sessionId = sessions.sessions[0]?.id
                    shareConnection(accessToken, sessionId)
                })
                .catch(() => {
                    // Token is invalid, clear state and redirect to login
                    localStorage.clear()
                    if (!isLoginPage) {
                        window.location.href = LOGIN_PAGE_REDIRECT
                    }
                })
        }
    }
}

export const shareConnection = (token: string, sessionId: string) => {
    if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
            {
                type: WalletEvent.SPLICE_WALLET_IDP_AUTH_SUCCESS,
                token,
                sessionId,
            },
            '*'
        )
    }
}

export const addUserSession = async (token: string, networkId: string) => {
    const authenticatedUserClient = await createUserClient(token)
    const session = await authenticatedUserClient.request('addSession', {
        networkId,
    })

    shareConnection(token, session.id)
}
