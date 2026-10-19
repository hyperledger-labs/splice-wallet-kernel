// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { HttpTransport } from '@canton-network/core-rpc-transport'
import UserApiClient from '@canton-network/core-wallet-user-rpc-client'
import { stateManager } from './state-manager'
import { LOGIN_PAGE_REDIRECT } from './constants'
import { setLocationHref } from './navigation.js'
import {
    getCurrentRoute,
    toRelHref,
    toRelPath,
} from '@canton-network/core-wallet-ui-components'
import { detectCurrentOrigin } from './listeners.js'

let isLoggingOut = false
let userApiPathPromise: Promise<URL> | null = null

// Clears module-level caches between unit tests
export function resetRpcClientCachesForTests(): void {
    userApiPathPromise = null
    isLoggingOut = false
}

const getUserApiPath = async (): Promise<URL> => {
    const defaultUserUrl = new URL(
        toRelPath('/api/v0/user'),
        window.location.origin
    )

    if (!userApiPathPromise) {
        userApiPathPromise = fetch(
            toRelPath('/.well-known/wallet-gateway-config'),
            { headers: { Accept: 'application/json' } }
        )
            .then((response) => response.json())
            .then((config) =>
                config?.userApiUrl ? new URL(config.userApiUrl) : defaultUserUrl
            )
            .catch((error) => {
                console.warn(
                    'Failed to fetch userApiUrl from config, using default',
                    error
                )
                return defaultUserUrl
            })
    }
    return userApiPathPromise
}

export const attemptRemoveSession = async (
    accessToken: string
): Promise<void> => {
    try {
        const userApiPath = await getUserApiPath()
        // Use HttpTransport directly (not HttpTransportWithAuthInterceptor)
        // to avoid infinite loops if removeSession itself returns 401
        const userApiClient = new UserApiClient(
            new HttpTransport(userApiPath, accessToken)
        )
        await userApiClient.request({ method: 'removeSession' })
    } catch (error) {
        // If removeSession fails that's okay
        // We still want to clear local state
        console.debug('Failed to remove session: ', error)
    }
}

const handleAutoLogout = async (): Promise<void> => {
    // Prevent multiple simultaneous logout attempts
    if (isLoggingOut) {
        return
    }

    isLoggingOut = true
    const currentOrigin = await detectCurrentOrigin()

    try {
        const accessToken = await stateManager.accessToken.get(currentOrigin)
        if (accessToken) {
            await attemptRemoveSession(accessToken)
        }
    } finally {
        await stateManager.clearAuthState(currentOrigin)
        isLoggingOut = false

        if (getCurrentRoute(window.location.pathname) !== LOGIN_PAGE_REDIRECT) {
            setLocationHref(toRelHref(LOGIN_PAGE_REDIRECT))
        }
    }
}

class HttpTransportWithAuthInterceptor extends HttpTransport {
    protected async handleErrorResponse(response: Response): Promise<never> {
        if (response.status === 401) {
            void handleAutoLogout()
        }
        return super.handleErrorResponse(response)
    }
}

export const createUserClient = async (
    token?: string
): Promise<UserApiClient> => {
    const userApiPath = await getUserApiPath()
    return new UserApiClient(
        new HttpTransportWithAuthInterceptor(userApiPath, token)
    )
}
