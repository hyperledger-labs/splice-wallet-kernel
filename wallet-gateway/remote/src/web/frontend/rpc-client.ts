// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { HttpTransport } from '@canton-network/core-rpc-transport'
import UserApiClient from '@canton-network/core-wallet-user-rpc-client'
import { stateManager } from './state-manager'
import {
    LOGIN_PAGE_REDIRECT,
    getCurrentRoute,
    toGatewayPath,
    toGatewayRouteHref,
} from './constants'

let isLoggingOut = false
let userApiPathPromise: Promise<URL> | null = null

const getUserApiPath = async (): Promise<URL> => {
    const defaultUserPath = new URL(
        toGatewayPath('/api/v0/user', window.location.pathname),
        window.location.origin
    )

    if (!userApiPathPromise) {
        userApiPathPromise = fetch(
            toGatewayPath(
                '/.well-known/wallet-gateway-config',
                window.location.pathname
            )
        )
            .then((response) => response.json())
            .then((config) =>
                config?.userPath ? new URL(config.userPath) : defaultUserPath
            )
            .catch((error) => {
                console.warn(
                    'Failed to fetch userPath from config, using default',
                    error
                )
                return defaultUserPath
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
        console.debug('Failed to remove session:', error)
    }
}

const handleAutoLogout = async (): Promise<void> => {
    // Prevent multiple simultaneous logout attempts
    if (isLoggingOut) {
        return
    }

    isLoggingOut = true

    try {
        const accessToken = stateManager.accessToken.get()
        if (accessToken) {
            await attemptRemoveSession(accessToken)
        }
    } finally {
        stateManager.clearAuthState()
        isLoggingOut = false

        if (getCurrentRoute(window.location.pathname) !== LOGIN_PAGE_REDIRECT) {
            window.location.href = toGatewayRouteHref(
                LOGIN_PAGE_REDIRECT,
                window.location.pathname
            )
        }
    }
}

class HttpTransportWithAuthInterceptor extends HttpTransport {
    protected async handleErrorResponse(response: Response): Promise<never> {
        if (response.status === 401) {
            handleAutoLogout()
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
