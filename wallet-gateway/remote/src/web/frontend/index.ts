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

        if (!accessToken) {
            this.handleUnauthenticated(isLoginPage)
            return
        }

        if (this.isTokenExpired()) {
            this.handleExpiredToken(isLoginPage)
            return
        }

        if (isLoginPage) {
            await this.handleAuthenticatedOnLoginPage(accessToken)
            return
        }

        await this.handleAuthenticatedOnOtherPage(accessToken)
    }

    private getIntendedPageFromCurrentPath(): AllowedRoute | undefined {
        const currentPath = window.location.pathname
        if (
            currentPath !== '/' &&
            !currentPath.startsWith(LOGIN_PAGE_REDIRECT) &&
            !currentPath.startsWith('/callback')
        ) {
            const normalizedPath = currentPath.replace(/\/$/, '') || '/'
            return normalizedPath as AllowedRoute
        }
        return undefined
    }

    private clearAuthStateAndPreserveIntendedPage(): void {
        const intendedPage = this.getIntendedPageFromCurrentPath()
        stateManager.clearAuthState()
        if (intendedPage) {
            stateManager.intendedPage.set(intendedPage)
        }
    }

    private handleUnauthenticated(isLoginPage: boolean): void {
        if (!isLoginPage) {
            const intendedPage = this.getIntendedPageFromCurrentPath()
            if (intendedPage) {
                stateManager.intendedPage.set(intendedPage)
            }
            window.location.href = LOGIN_PAGE_REDIRECT
        }
    }

    private handleExpiredToken(isLoginPage: boolean): void {
        if (!isLoginPage) {
            this.clearAuthStateAndPreserveIntendedPage()
            window.location.href = LOGIN_PAGE_REDIRECT
        } else {
            stateManager.clearAuthState()
        }
    }

    private async handleAuthenticatedOnLoginPage(
        accessToken: string
    ): Promise<void> {
        const isValid = await this.validateToken(accessToken)
        if (isValid) {
            redirectToIntendedOrDefault()
            shareConnection()
        } else {
            stateManager.clearAuthState()
        }
    }

    private async handleAuthenticatedOnOtherPage(
        accessToken: string
    ): Promise<void> {
        const networkId = stateManager.networkId.get()
        if (!networkId) {
            throw new Error('missing networkId in state manager')
        }

        const isValid = await this.validateToken(accessToken)
        if (!isValid) {
            // Token is invalid - clear auth state and preserve intended page
            this.clearAuthStateAndPreserveIntendedPage()
            window.location.href = LOGIN_PAGE_REDIRECT
            return
        }

        // Token is valid - share the connection with the opener window if it exists
        shareConnection()

        // Redirect to default page if on root path
        if (window.location.pathname === '/') {
            redirectToIntendedOrDefault()
        }
    }

    private isTokenExpired(): boolean {
        const expirationDate = new Date(stateManager.expirationDate.get() || 0)
        return expirationDate <= new Date()
    }

    // Verify that the access token is still valid by making a simple RPC call
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

export const shareConnection = (): void => {
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
