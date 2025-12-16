// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, LitElement } from 'lit'
import { customElement } from 'lit/decorators.js'
import { createUserClient } from './rpc-client'

import '@canton-network/core-wallet-ui-components'
import '@canton-network/core-wallet-ui-components/dist/index.css'
import '/index.css'
import { stateManager } from './state-manager'
import { WalletEvent } from '@canton-network/core-types'
import {
    DEFAULT_PAGE_REDIRECT,
    NOT_FOUND_PAGE_REDIRECT,
    LOGIN_PAGE_REDIRECT,
    AllowedRoute,
    isAllowedRoute,
} from './constants'

export const redirectToIntendedOrDefault = (): void => {
    const intendedPage = stateManager.intendedPage.get()
    stateManager.intendedPage.clear()
    window.location.href = intendedPage || DEFAULT_PAGE_REDIRECT
}

@customElement('user-app')
export class UserApp extends LitElement {
    private async handleLogout() {
        const accessToken = stateManager.accessToken.get()

        if (!accessToken) {
            window.location.href = LOGIN_PAGE_REDIRECT
            return
        }

        try {
            const userClient = await createUserClient(accessToken)
            await userClient.request('removeSession')
        } catch (error) {
            // If removeSession fails (for example token is invalid),
            // clear the local state anyway
            console.debug('Failed to remove session during logout:', error)
        }

        stateManager.clearAuthState()

        if (
            window.name === 'wallet-popup' &&
            window.opener &&
            !window.opener.closed
        ) {
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

        // remove trailing slash (except root)
        const normalizedPath =
            window.location.pathname.replace(/\/$/, '') || '/'
        // Only redirect to 404 if route is not allowed
        // If route is allowed, let UserUIAuthRedirect handle any redirects
        if (!isAllowedRoute(normalizedPath)) {
            window.location.href = NOT_FOUND_PAGE_REDIRECT
        }
        // TODO verify all cases if it should redirect or not
    }
}

@customElement('user-ui-auth-redirect')
export class UserUIAuthRedirect extends LitElement {
    connectedCallback(): void {
        super.connectedCallback()
        this.handleAuthRedirect()
    }

    private async handleAuthRedirect(): Promise<void> {
        const isLoginPage =
            window.location.pathname.startsWith(LOGIN_PAGE_REDIRECT)
        const accessToken = stateManager.accessToken.get()

        // If not on login page and not authenticated, store intended page and redirect to login
        if (!accessToken && !isLoginPage) {
            // Store the intended page for redirect after login
            const currentPath = window.location.pathname
            if (
                currentPath !== '/' &&
                !currentPath.startsWith(LOGIN_PAGE_REDIRECT) &&
                !currentPath.startsWith('/callback')
            ) {
                // Remove trailing slash for consistency
                const normalizedPath = currentPath.replace(/\/$/, '') || '/'
                stateManager.intendedPage.set(normalizedPath as AllowedRoute)
            }
            window.location.href = LOGIN_PAGE_REDIRECT
            return
        }

        // If authenticated, check token expiration
        if (accessToken) {
            const expirationDate = new Date(
                stateManager.expirationDate.get() || ''
            )
            const now = new Date()

            // Check if token has already expired
            if (expirationDate <= now) {
                // Token has expired, clear state and redirect to login
                stateManager.clearAuthState()
                if (!isLoginPage) {
                    window.location.href = LOGIN_PAGE_REDIRECT
                }
                return
            }

            // Token is still valid - API calls will catch 401 errors if token becomes invalid

            // If on login page and authenticated, validate token before redirecting
            if (isLoginPage) {
                const isValid = await this.validateToken(accessToken)
                if (isValid) {
                    // Token is valid, redirect to intended page or default
                    redirectToIntendedOrDefault()
                } else {
                    // Token is invalid, clear state and stay on login page
                    stateManager.clearAuthState()
                }
                return
            }

            // Not on login page, ensure session is added to backend
            const networkId = stateManager.networkId.get()
            if (!networkId) {
                throw new Error('missing networkId in state manager')
            }

            // Ensure to add the session to the backend
            try {
                await authenticate(accessToken, networkId)
            } catch (error) {
                // If authentication fails (e.g., 401), the error interceptor will handle logout
                console.debug('Failed to authenticate:', error)
            }

            // If on root path, redirect to intended page or default
            if (window.location.pathname === '/') {
                redirectToIntendedOrDefault()
            }
        }
    }

    /**
     * Validate token by making a lightweight API call
     */
    private async validateToken(accessToken: string): Promise<boolean> {
        try {
            const userClient = await createUserClient(accessToken)
            // Use listSessions as a lightweight validation call
            await userClient.request('listSessions')
            return true
        } catch (error) {
            // If validation fails (e.g., 401), token is invalid
            console.debug('Token validation failed:', error)
            return false
        }
    }
}

export const authenticate = async (
    accessToken: string,
    networkId: string
): Promise<void> => {
    const authenticatedUserClient = await createUserClient(accessToken)
    await authenticatedUserClient.request('addSession', {
        networkId,
    })

    if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
            {
                type: WalletEvent.SPLICE_WALLET_IDP_AUTH_SUCCESS,
                token: stateManager.accessToken.get(),
            },
            '*'
        )
    }
}
