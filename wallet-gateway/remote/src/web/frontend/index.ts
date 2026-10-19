// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html, LitElement } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { createUserClient, attemptRemoveSession } from './rpc-client'
import { setLocationHref } from './navigation.js'

import '@canton-network/core-wallet-ui-components'
import { stateManager } from './state-manager'
import { WalletEvent } from '@canton-network/core-types'
import { errorCodes, JsonRpcError } from '@canton-network/core-rpc-errors'
import {
    DEFAULT_PAGE_REDIRECT,
    NOT_FOUND_PAGE_REDIRECT,
    LOGIN_PAGE_REDIRECT,
    TOKEN_EXPIRED_SKEW_MS,
    TOKEN_EXPIRATION_TIMEOUT_LIMIT_MS,
} from './constants'
import {
    type AllowedRoute,
    getCurrentRoute,
    handleErrorToast,
    isAllowedRoute,
    toRelHref,
    toRelPath,
} from '@canton-network/core-wallet-ui-components'
import './listeners'
import { detectCurrentOrigin } from './listeners'
import { fetchDappApiUrl, showToast } from './utils'

const globalPageResetStyle = document.createElement('style')
globalPageResetStyle.textContent = `
    html,
    body {
        margin: 0;
        padding: 0;
        min-height: 100%;
    }
`
document.head.appendChild(globalPageResetStyle)

export const redirectToIntendedOrDefault = async (): Promise<void> => {
    const currentOrigin = await detectCurrentOrigin()
    const intendedPage = stateManager.intendedPage.get(currentOrigin)
    stateManager.intendedPage.clear(currentOrigin)
    const route = intendedPage || DEFAULT_PAGE_REDIRECT
    setLocationHref(toRelHref(route))
}

@customElement('user-app')
export class UserApp extends LitElement {
    @state() accessor currentOrigin: string | null = null
    @state() private accessor networkConnected = false
    @state() accessor dappApiUrl: string = ''
    @state() accessor showPage = false

    static styles = css`
        .loading {
            color: var(--wg-text-secondary);
            margin-bottom: var(--wg-space-3);
        }
    `

    async connectedCallback(): Promise<void> {
        super.connectedCallback()
        this.currentOrigin = await detectCurrentOrigin()
        void this.refreshNetworkConnected()
    }

    private async refreshNetworkConnected(): Promise<void> {
        const currentOrigin =
            this.currentOrigin ?? (await detectCurrentOrigin())
        const accessToken = await stateManager.accessToken.get(currentOrigin)
        if (!accessToken) {
            this.networkConnected = false
            return
        }

        try {
            const userClient = await createUserClient(accessToken)
            const result = await userClient.request({ method: 'listSessions' })
            this.networkConnected = result.sessions?.[0]?.status === 'connected'
        } catch {
            this.networkConnected = false
        }
        this.dappApiUrl = await fetchDappApiUrl()
    }

    // The page stays out of the document until the session behind it is
    // verified. Showing it earlier lets the user act on a page that is already
    // on its way to the login page.
    private handleAuthSettled(e: AuthSettledEvent) {
        this.showPage = e.detail.verdict === 'show-page'
    }

    private async handleLogout() {
        clearTokenExpirationTimeout()

        const currentOrigin = await detectCurrentOrigin()
        const accessToken = await stateManager.accessToken.get(currentOrigin)

        if (!accessToken) {
            setLocationHref(toRelHref(LOGIN_PAGE_REDIRECT))
            return
        }

        try {
            const userClient = await createUserClient(accessToken)
            await userClient.request({ method: 'removeSession' })
        } catch (error) {
            // If removeSession fails (for example token is invalid),
            // clear the local state anyway
            console.debug('Failed to remove session during logout: ', error)
        }

        await stateManager.clearAuthState(currentOrigin)

        if (window.opener && !window.opener.closed) {
            window.opener.postMessage(
                { type: WalletEvent.SPLICE_WALLET_LOGOUT },
                '*'
            )
            // close the gateway UI automatically if we are within a popup
            window.close()
        } else {
            // if the gateway UI is running in the main window, redirect to login
            setLocationHref(toRelHref(LOGIN_PAGE_REDIRECT))
        }
    }

    private async handleCopyDappApiUrl(): Promise<void> {
        try {
            const dappApiUrl = await fetchDappApiUrl()
            await navigator.clipboard.writeText(dappApiUrl)
            showToast('Copied', 'Dapp API URL copied to clipboard.', 'success')
        } catch (error) {
            console.debug('Failed to copy dApp API URL: ', error)
            showToast(
                'Copy failed',
                'Could not copy the Dapp API URL.',
                'error'
            )
        }
    }

    protected render() {
        const networkId = stateManager.networkId.get(this.currentOrigin || '')
        const networkName = networkId || 'No network connected'

        return html`
            <app-layout
                iconSrc=${toRelPath('/icon.png')}
                .networkName=${networkName}
                .networkConnected=${this.networkConnected}
                .dappApiUrl=${this.dappApiUrl}
                @logout=${this.handleLogout}
                @copy-dapp-api-url=${this.handleCopyDappApiUrl}
            >
                <user-ui-auth-redirect
                    @auth-settled=${this.handleAuthSettled}
                ></user-ui-auth-redirect>
                ${
                    this.showPage
                        ? html`<slot></slot>`
                        : html`<p class="loading">Loading...</p>`
                }
            </app-layout>
        `
    }
}

@customElement('user-ui')
export class UserUI extends LitElement {
    connectedCallback(): void {
        super.connectedCallback()

        const currentRoute = getCurrentRoute(window.location.pathname) || '/'
        // Only redirect to 404 if route is not allowed
        // If route is allowed, let UserUIAuthRedirect handle any redirects
        if (!isAllowedRoute(currentRoute)) {
            setLocationHref(toRelHref(NOT_FOUND_PAGE_REDIRECT))
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

// The gateway couldn't verify the token, e.g. because its identity provider is
// down. The token may still be valid, so this must not end the session.
const isUnavailable = (error: unknown): boolean =>
    error instanceof JsonRpcError &&
    error.code === errorCodes.rpc.resourceUnavailable

const getSessionId = async (token: string): Promise<string | undefined> => {
    const userClient = await createUserClient(token)
    const sessions = await userClient
        .request({ method: 'listSessions' })
        .catch((error: unknown) => {
            if (isUnavailable(error)) {
                throw error
            }
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

// Whether the page the browser loaded is the one the user gets to see, or is
// about to be replaced by a redirect.
export type AuthVerdict = 'show-page' | 'redirecting'

export class AuthSettledEvent extends CustomEvent<{ verdict: AuthVerdict }> {
    constructor(verdict: AuthVerdict) {
        super('auth-settled', {
            bubbles: true,
            composed: true,
            detail: { verdict },
        })
    }
}

@customElement('user-ui-auth-redirect')
export class UserUIAuthRedirect extends LitElement {
    connectedCallback(): void {
        super.connectedCallback()
        void this.handleAuthRedirect()
    }

    private async handleAuthRedirect(): Promise<void> {
        let verdict: AuthVerdict = 'redirecting'
        try {
            verdict = await this.resolveAuthRedirect()
        } catch (error) {
            // Keep the session, reloading the page tries again
            if (isUnavailable(error)) {
                handleErrorToast(error)
                return
            }
            // Without a verdict there is no safe page to show, so treat any
            // unexpected failure as a reason to start over at the login page.
            console.error('Failed to verify the session: ', error)
            await this.clearAuthStateAndPreserveIntendedPage()
            setLocationHref(toRelHref(LOGIN_PAGE_REDIRECT))
        } finally {
            this.dispatchEvent(new AuthSettledEvent(verdict))
        }
    }

    private async resolveAuthRedirect(): Promise<AuthVerdict> {
        const currentRoute = getCurrentRoute(window.location.pathname)
        const isLoginPage = currentRoute === LOGIN_PAGE_REDIRECT
        const currentOrigin = await detectCurrentOrigin()
        const accessToken = await stateManager.accessToken.get(currentOrigin)

        if (!accessToken) {
            return this.handleUnauthenticated(isLoginPage, currentOrigin)
        }

        if (this.isTokenExpired(currentOrigin)) {
            return this.handleExpiredToken(isLoginPage)
        }

        if (isLoginPage) {
            return this.handleAuthenticatedOnLoginPage(accessToken)
        }

        return this.handleAuthenticatedOnLoggedInPage(accessToken)
    }

    private getIntendedPageFromCurrentPath(): AllowedRoute | undefined {
        const currentPath = getCurrentRoute(window.location.pathname)
        if (
            currentPath &&
            currentPath !== '/' &&
            currentPath !== LOGIN_PAGE_REDIRECT &&
            currentPath !== '/callback'
        ) {
            return currentPath
        }
        return undefined
    }

    private async clearAuthStateAndPreserveIntendedPage(): Promise<void> {
        const intendedPage = this.getIntendedPageFromCurrentPath()
        const currentOrigin = await detectCurrentOrigin()

        await stateManager.clearAuthState(currentOrigin)
        if (intendedPage) {
            stateManager.intendedPage.set(intendedPage, currentOrigin)
        }
    }

    private handleUnauthenticated(
        isLoginPage: boolean,
        currentOrigin: string
    ): AuthVerdict {
        if (isLoginPage) {
            return 'show-page'
        }

        const intendedPage = this.getIntendedPageFromCurrentPath()
        if (intendedPage) {
            stateManager.intendedPage.set(intendedPage, currentOrigin)
        }
        setLocationHref(toRelHref(LOGIN_PAGE_REDIRECT))
        return 'redirecting'
    }

    private async handleExpiredToken(
        isLoginPage: boolean
    ): Promise<AuthVerdict> {
        clearTokenExpirationTimeout()

        const currentOrigin = await detectCurrentOrigin()
        const accessToken = await stateManager.accessToken.get(currentOrigin)
        if (accessToken) {
            // Attempt to remove session even if token is expired
            await attemptRemoveSession(accessToken)
        }

        if (!isLoginPage) {
            await this.clearAuthStateAndPreserveIntendedPage()
            setLocationHref(toRelHref(LOGIN_PAGE_REDIRECT))
            return 'redirecting'
        }

        await stateManager.clearAuthState(currentOrigin)
        return 'show-page'
    }

    private async handleAuthenticatedOnLoginPage(
        accessToken: string
    ): Promise<AuthVerdict> {
        const sessionId = await getSessionId(accessToken)
        const currentOrigin = await detectCurrentOrigin()
        if (sessionId) {
            this.setTokenExpirationTimeout(currentOrigin)
            await redirectToIntendedOrDefault()
            shareConnection(accessToken, sessionId)
            return 'redirecting'
        }

        await attemptRemoveSession(accessToken)
        await stateManager.clearAuthState(currentOrigin)
        return 'show-page'
    }

    private async handleAuthenticatedOnLoggedInPage(
        accessToken: string
    ): Promise<AuthVerdict> {
        const currentOrigin = await detectCurrentOrigin()
        const networkId = stateManager.networkId.get(currentOrigin)
        if (!networkId) {
            throw new Error('missing networkId in state manager')
        }

        const sessionId = await getSessionId(accessToken)
        if (!sessionId) {
            await attemptRemoveSession(accessToken)
            await this.clearAuthStateAndPreserveIntendedPage()
            setLocationHref(toRelHref(LOGIN_PAGE_REDIRECT))
            return 'redirecting'
        }

        // Token is valid - set up expiration timeout
        this.setTokenExpirationTimeout(currentOrigin)
        shareConnection(accessToken, sessionId)

        // Redirect to default page if on root path
        if ((getCurrentRoute(window.location.pathname) || '/') === '/') {
            await redirectToIntendedOrDefault()
            return 'redirecting'
        }

        return 'show-page'
    }

    private setTokenExpirationTimeout(origin: string): void {
        clearTokenExpirationTimeout()

        const expirationDate = new Date(
            stateManager.expirationDate.get(origin) || ''
        )
        const now = new Date()
        const timeUntilExpiration =
            expirationDate.getTime() - now.getTime() - TOKEN_EXPIRED_SKEW_MS

        if (timeUntilExpiration > 0) {
            tokenExpirationTimeoutId = setTimeout(
                async () => {
                    tokenExpirationTimeoutId = null

                    if (!this.isTokenExpired(origin)) {
                        this.setTokenExpirationTimeout(origin)
                        return
                    }

                    const isLoginPage =
                        getCurrentRoute(window.location.pathname) ===
                        LOGIN_PAGE_REDIRECT
                    await this.handleExpiredToken(isLoginPage)
                },
                Math.min(timeUntilExpiration, TOKEN_EXPIRATION_TIMEOUT_LIMIT_MS)
            )
        }
    }

    private isTokenExpired(origin: string): boolean {
        const expirationDate = new Date(
            stateManager.expirationDate.get(origin) || 0
        )
        return Number(expirationDate) - TOKEN_EXPIRED_SKEW_MS <= Date.now()
    }
}

export const addUserSession = async (token: string, networkId: string) => {
    const authenticatedUserClient = await createUserClient(token)

    const currentOrigin = await detectCurrentOrigin()

    if (!currentOrigin) {
        throw new Error('Missing dApp origin. Cannot add user session.')
    }

    const session = await authenticatedUserClient.request({
        method: 'addSession',
        params: {
            origin: currentOrigin,
            networkId,
        },
    })

    shareUserSession(token, session.id, currentOrigin)
}

export const shareUserSession = (
    token: string,
    sessionId: string,
    origin: string
) => {
    stateManager.sessionId.set(sessionId, origin)
    shareConnection(token, sessionId)
}
