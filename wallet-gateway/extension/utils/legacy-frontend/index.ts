// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html, LitElement } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import {
    createUserClient,
    attemptRemoveSession,
} from '@/utils/legacy-frontend/rpc-client'
import { setLocationHref } from '@/utils/legacy-frontend/navigation.js'

import '@canton-network/core-wallet-ui-components'
import { stateManager } from '@/utils/legacy-frontend/state-manager'
import { WalletEvent } from '@canton-network/core-types'
import {
    DEFAULT_PAGE_REDIRECT,
    NOT_FOUND_PAGE_REDIRECT,
    LOGIN_PAGE_REDIRECT,
    TOKEN_EXPIRED_SKEW_MS,
} from '@/utils/legacy-frontend/constants'
import {
    type AllowedRoute,
    getCurrentRoute,
    isAllowedRoute,
    toRelHref,
    toRelPath,
} from './routing'
import '@/utils/legacy-frontend/listeners'
import { detectCurrentOrigin } from '@/utils/legacy-frontend/listeners'
import { fetchDappApiUrl, showToast } from '@/utils/legacy-frontend/utils'
import { createProxyService } from '@webext-core/proxy-service'

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
    const intendedPage = await stateManager.intendedPage.get(currentOrigin)
    await stateManager.intendedPage.clear(currentOrigin)
    const route =
        intendedPage && isAllowedRoute(intendedPage)
            ? intendedPage
            : DEFAULT_PAGE_REDIRECT
    setLocationHref(toRelHref(route))
}

@customElement('user-app')
export class UserApp extends LitElement {
    @state() accessor currentOrigin: string | null = null
    @state() accessor networkConnected = false
    @state() accessor dappApiUrl: string = ''
    @state() accessor showPage = false

    // Add a state variable to hold the resolved networkId
    @state() accessor networkId: string | null = null

    static override styles = css`
        .loading {
            color: var(--wg-text-secondary);
            margin-bottom: var(--wg-space-3);
        }
    `

    override async connectedCallback(): Promise<void> {
        super.connectedCallback()
        this.currentOrigin = await detectCurrentOrigin()
        void this.refreshNetworkConnected()
    }

    private async refreshNetworkConnected(): Promise<void> {
        const currentOrigin =
            this.currentOrigin ?? (await detectCurrentOrigin())

        // Fetch the networkId asynchronously and store it in state
        this.networkId = await stateManager.networkId.get(currentOrigin)

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
            logger.debug('Failed to remove session during logout: {*}', {
                error,
            })
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
            logger.debug('Failed to copy dApp API URL: {*}', { error })
            showToast(
                'Copy failed',
                'Could not copy the Dapp API URL.',
                'error'
            )
        }
    }

    protected override render() {
        // Read the resolved string directly from state
        const networkName = this.networkId || 'No network connected'

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
    override connectedCallback(): void {
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

const getSessionId = async (token: string): Promise<string | undefined> => {
    const userClient = await createUserClient(token)
    const sessions = await userClient
        .request({ method: 'listSessions' })
        .catch(() => {
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
    override connectedCallback(): void {
        super.connectedCallback()
        this.handleAuthRedirect().catch((error) => {
            logger.error('Failed to handle auth redirect: {*}', { error })
        })
    }

    private async handleAuthRedirect(): Promise<void> {
        let verdict: AuthVerdict = 'redirecting'
        try {
            verdict = await this.resolveAuthRedirect()
        } catch (error) {
            // Without a verdict there is no safe page to show, so treat any
            // unexpected failure as a reason to start over at the login page.
            logger.error('Failed to verify the session: {*}', { error })
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
        const expirationDate =
            await stateManager.expirationDate.get(currentOrigin)

        if (!accessToken) {
            return this.handleUnauthenticated(isLoginPage, currentOrigin)
        }

        if (this.isTokenExpired(expirationDate || undefined)) {
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
            return currentPath as AllowedRoute
        }
        return undefined
    }

    private async clearAuthStateAndPreserveIntendedPage(): Promise<void> {
        const intendedPage = this.getIntendedPageFromCurrentPath()
        const currentOrigin = await detectCurrentOrigin()

        await stateManager.clearAuthState(currentOrigin)
        if (intendedPage) {
            await stateManager.intendedPage.set(intendedPage, currentOrigin)
        }
    }

    private async handleUnauthenticated(
        isLoginPage: boolean,
        currentOrigin: string
    ): Promise<AuthVerdict> {
        if (isLoginPage) {
            return 'show-page'
        }

        const intendedPage = this.getIntendedPageFromCurrentPath()
        if (intendedPage) {
            await stateManager.intendedPage.set(intendedPage, currentOrigin)
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

        const expirationDate =
            await stateManager.expirationDate.get(currentOrigin)

        if (sessionId) {
            this.setTokenExpirationTimeout(expirationDate || '')
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
        const networkId = await stateManager.networkId.get(currentOrigin)
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
        const expirationDate =
            (await stateManager.expirationDate.get(currentOrigin)) || ''
        this.setTokenExpirationTimeout(expirationDate)
        shareConnection(accessToken, sessionId)

        // Redirect to default page if on root path
        if ((getCurrentRoute(window.location.pathname) || '/') === '/') {
            await redirectToIntendedOrDefault()
            return 'redirecting'
        }

        return 'show-page'
    }

    private setTokenExpirationTimeout(expirationDate: string): void {
        clearTokenExpirationTimeout()

        const expiry = new Date(expirationDate)
        const now = new Date()
        const timeUntilExpiration =
            expiry.getTime() - now.getTime() - TOKEN_EXPIRED_SKEW_MS

        if (timeUntilExpiration > 0) {
            tokenExpirationTimeoutId = setTimeout(async () => {
                const isLoginPage =
                    getCurrentRoute(window.location.pathname) ===
                    LOGIN_PAGE_REDIRECT
                await this.handleExpiredToken(isLoginPage)
                tokenExpirationTimeoutId = null
            }, timeUntilExpiration)
        }
    }

    private isTokenExpired(expirationDate?: string): boolean {
        const expiry = new Date(expirationDate || 0)
        return Number(expiry) - TOKEN_EXPIRED_SKEW_MS <= Date.now()
    }
}

export const addUserSession = async (token: string, networkId: string) => {
    const authClient = createProxyService(AUTH_SERVICE_KEY)
    await authClient.storeAuthContext(token)

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

    await stateManager.sessionId.set(session.id, currentOrigin)
    shareConnection(token, session.id)
}
