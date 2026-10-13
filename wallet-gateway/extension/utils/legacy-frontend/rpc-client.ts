// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { RpcTransport } from '@canton-network/core-rpc-transport'
import UserApiClient from '@canton-network/core-wallet-user-rpc-client'
import type {
    RequestPayload,
    SuccessResponse,
} from '@canton-network/core-types'
import type { Methods as UserRpcMethods } from '@/entrypoints/background/user/rpc-gen/index'
import { createProxyService } from '@webext-core/proxy-service'

export const attemptRemoveSession = async (
    accessToken: string
): Promise<void> => {
    try {
        // Use HttpTransport directly (not HttpTransportWithAuthInterceptor)
        // to avoid infinite loops if removeSession itself returns 401
        const userApiClient = await createUserClient(accessToken)
        await userApiClient.request({ method: 'removeSession' })
    } catch (error) {
        // If removeSession fails that's okay
        // We still want to clear local state
        logger.debug('Failed to remove session: {*}', { error })
    }
}

class ExtensionTransport implements RpcTransport {
    private service: UserRpcMethods

    constructor() {
        this.service = createProxyService(USER_RPC_KEY)
    }

    submit(request: RequestPayload): Promise<SuccessResponse> {
        const { method, params } = request
        const fn = this.service[method as keyof UserRpcMethods]
        if (!fn) {
            throw new Error(`Method ${method} not found in UserRpcMethods`)
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = fn(params as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { result } as any
    }
}

export const createUserClient = async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token?: string
): Promise<UserApiClient> => {
    return new UserApiClient(new ExtensionTransport())
}
