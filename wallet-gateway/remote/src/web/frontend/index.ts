// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, LitElement } from 'lit'
import { customElement } from 'lit/decorators.js'
import { createUserClient, attemptRemoveSession } from './rpc-client'

import '@canton-network/core-wallet-ui-components'
import '@canton-network/core-wallet-ui-components/dist/index.css'
import '/index.css'
import { stateManager } from './state-manager'
import { WalletEvent } from '@canton-network/core-types'
import {
    DEFAULT_PAGE_REDIRECT,
    NOT_FOUND_PAGE_REDIRECT,
    LOGIN_PAGE_REDIRECT,
    TOKEN_EXPIRED_SKEW_MS,
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
        clearTokenExpirationTimeout()

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

let tokenExpirationTimeoutId: ReturnType<typeof setTimeout> | null = null

const clearTokenExpirationTimeout = (): void => {
    if (tokenExpirationTimeoutId !== null) {
        clearTimeout(tokenExpirationTimeoutId)
        tokenExpirationTimeoutId = null
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

        await this.handleAuthenticatedOnLoggedInPage(accessToken)
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

    private async handleExpiredToken(isLoginPage: boolean): Promise<void> {
        clearTokenExpirationTimeout()

        const accessToken = stateManager.accessToken.get()
        if (accessToken) {
            // Attempt to remove session even if token is expired
            await attemptRemoveSession(accessToken)
        }

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
        const sessionId = await getSessionId(accessToken)
        if (sessionId) {
            this.setTokenExpirationTimeout()
            redirectToIntendedOrDefault()
            shareConnection(accessToken, sessionId)
        } else {
            await attemptRemoveSession(accessToken)
            stateManager.clearAuthState()
        }
    }

    private async handleAuthenticatedOnLoggedInPage(
        accessToken: string
    ): Promise<void> {
        const networkId = stateManager.networkId.get()
        if (!networkId) {
            throw new Error('missing networkId in state manager')
        }

        const sessionId = await getSessionId(accessToken)
        if (!sessionId) {
            await attemptRemoveSession(accessToken)
            this.clearAuthStateAndPreserveIntendedPage()
            window.location.href = LOGIN_PAGE_REDIRECT
            return
        }

        // Token is valid - set up expiration timeout
        this.setTokenExpirationTimeout()
        shareConnection(accessToken, sessionId)

        // Redirect to default page if on root path
        if (window.location.pathname === '/') {
            redirectToIntendedOrDefault()
        }
    }

    private setTokenExpirationTimeout(): void {
        clearTokenExpirationTimeout()

        const expirationDate = new Date(stateManager.expirationDate.get() || '')
        const now = new Date()
        const timeUntilExpiration =
            expirationDate.getTime() - now.getTime() - TOKEN_EXPIRED_SKEW_MS

        if (timeUntilExpiration > 0) {
            tokenExpirationTimeoutId = setTimeout(async () => {
                const isLoginPage =
                    window.location.pathname.startsWith(LOGIN_PAGE_REDIRECT)
                await this.handleExpiredToken(isLoginPage)
                tokenExpirationTimeoutId = null
            }, timeUntilExpiration)
        }
    }

    private isTokenExpired(): boolean {
        const expirationDate = new Date(stateManager.expirationDate.get() || 0)
        return Number(expirationDate) - TOKEN_EXPIRED_SKEW_MS <= Date.now()
    }
}

const getSessionId = async (token: string): Promise<string | undefined> => {
    const userClient = await createUserClient(token)
    const sessions = await userClient.request('listSessions').catch(() => {
        return null
    })
    return sessions?.sessions?.[0]?.id ?? undefined
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
