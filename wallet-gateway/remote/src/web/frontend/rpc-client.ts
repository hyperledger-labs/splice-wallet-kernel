// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    HttpTransport,
    HttpError,
    ErrorResponse,
    RequestPayload,
    ResponsePayload,
    JsonRpcRequest,
} from '@canton-network/core-types'
import { providerErrors } from '@canton-network/core-rpc-errors'
import UserApiClient from '@canton-network/core-wallet-user-rpc-client'
import { stateManager } from './state-manager'
import { LOGIN_PAGE_REDIRECT } from './constants'
import { v4 as uuidv4 } from 'uuid'

// Flag to prevent multiple simultaneous logout attempts
let isLoggingOut = false

let userPathPromise: Promise<string> | null = null

const getUserPath = async (): Promise<string> => {
    if (!userPathPromise) {
        userPathPromise = fetch('/.well-known/wallet-gateway-config')
            .then((response) => response.json())
            .then((config) => config.userPath || '/api/v0/user')
            .catch((error) => {
                console.warn(
                    'Failed to fetch userPath from config, using default',
                    error
                )
                return '/api/v0/user' // Fallback to default
            })
    }
    return userPathPromise
}

/**
 * Automatically log out user when token becomes invalid
 */
const handleAutoLogout = async (): Promise<void> => {
    // Prevent multiple simultaneous logout attempts
    if (isLoggingOut) {
        return
    }

    isLoggingOut = true

    try {
        const accessToken = stateManager.accessToken.get()
        if (accessToken) {
            try {
                const userPath = await getUserPath()
                const url = new URL(`${window.location.origin}${userPath}`)
                const tempClient = new UserApiClient(
                    new HttpTransport(url, accessToken)
                )
                await tempClient.request('removeSession')
            } catch (error) {
                console.debug(
                    'Failed to remove session during auto-logout:',
                    error
                )
            }
        }

        stateManager.clearAuthState()

        if (!window.location.pathname.startsWith(LOGIN_PAGE_REDIRECT)) {
            window.location.href = LOGIN_PAGE_REDIRECT
        }
    } finally {
        setTimeout(() => {
            isLoggingOut = false
        }, 1000)
    }
}

class HttpTransportWithAuthInterceptor extends HttpTransport {
    private readonly url: URL
    private readonly accessToken?: string

    constructor(url: URL, accessToken?: string) {
        super(url, accessToken)
        this.url = url
        this.accessToken = accessToken
    }

    async submit(payload: RequestPayload): Promise<ResponsePayload> {
        const request: JsonRpcRequest = {
            jsonrpc: '2.0',
            method: payload.method,
            params: payload.params,
            id: uuidv4(),
        }

        const header = this.accessToken
            ? { Authorization: `Bearer ${this.accessToken}` }
            : undefined

        const response = await fetch(this.url.href, {
            method: 'POST',
            headers: {
                ...header,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        })

        // Check HTTP status 401 before JSON parsing
        if (response.status === 401) {
            handleAutoLogout()
            const body = await response.text()
            throw new HttpError(response.status, response.statusText, body)
        }

        if (!response.ok) {
            const body = await response.text()
            throw new HttpError(response.status, response.statusText, body)
        }

        // Parse JSON and check for JSON-RPC error codes
        const json = await response.json()

        // Check if it's an error response with unauthorized code
        if ('error' in json) {
            const errorResponse = json as ErrorResponse
            if (
                errorResponse.error.code === providerErrors.unauthorized().code
            ) {
                handleAutoLogout()
            }
        }

        // Continue with normal parsing
        return ResponsePayload.parse(json)
    }
}

export const createUserClient = async (
    token?: string
): Promise<UserApiClient> => {
    const userPath = await getUserPath()
    const url = new URL(`${window.location.origin}${userPath}`)
    return new UserApiClient(new HttpTransportWithAuthInterceptor(url, token))
}
