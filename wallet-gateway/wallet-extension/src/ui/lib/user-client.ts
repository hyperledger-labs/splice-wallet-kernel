// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import UserApiClient from '@canton-network/core-wallet-user-rpc-client'
import { createProxyService } from '@webext-core/proxy-service'
import { USER_RPC_KEY } from '@/shared/service-keys'

type UserRpcService = Record<string, (params: unknown) => Promise<unknown>>

let client: UserApiClient | undefined

/**
 * The user API client for the extension pages. Its requests go to the
 * background through the proxy service, so the shared logic and the typed
 * request helpers work the same as against the gateway's HTTP transport.
 */
export function getUserClient(): UserApiClient {
    client ??= createUserClient()
    return client
}

function createUserClient(): UserApiClient {
    // Every property of the proxy is a function that messages the background,
    // so the method name can't be checked here. `UserApiClient.request` only
    // accepts the user API's method names.
    const service = createProxyService(
        USER_RPC_KEY
    ) as unknown as UserRpcService

    return new UserApiClient({
        submit: async ({ method, params }) => ({
            result: await service[method]!(params),
        }),
    })
}
