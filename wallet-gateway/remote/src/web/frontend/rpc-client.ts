// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { HttpTransport } from '@canton-network/core-types'
import UserApiClient from '@canton-network/core-wallet-user-rpc-client'

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

export const createUserClient = async (
    token?: string
): Promise<UserApiClient> => {
    const userPath = await getUserPath()
    const url = new URL(`${window.location.origin}${userPath}`)
    return new UserApiClient(new HttpTransport(url, token))
}
