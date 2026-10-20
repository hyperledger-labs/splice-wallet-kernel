// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type AuthContext, jwtUserId } from '@canton-network/core-wallet-auth'
import { logger } from '@/shared/logger'
import { authContextItem } from '@/shared/storage'

/**
 * The signed-in user's token and user ID, kept in `local:authContext` so it
 * survives a service worker restart.
 */
export const authContext = {
    async store(token: string): Promise<void> {
        const userId = jwtUserId(token)
        logger.info('Storing auth context', { userId })
        await authContextItem.setValue({ userId, accessToken: token })
    },
    async load(): Promise<AuthContext | undefined> {
        return await authContextItem.getValue()
    },
    async clear(): Promise<void> {
        await authContextItem.removeValue()
    },
}
