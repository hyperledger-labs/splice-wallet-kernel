// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { decodeJwt } from 'jose'
import { AuthContext } from './auth-service'
import { providerErrors } from '@canton-network/core-rpc-errors'

export function assertConnected(
    authContext: AuthContext | undefined
): AuthContext {
    if (!authContext) {
        throw providerErrors.unauthorized({
            message: 'User is not connected',
        })
    }
    return authContext
}

/**
 * Extract a User ID from the `sub` claim of a JWT. Throws if `sub` is missing.
 *
 * @param token a base64 encoded JWT token
 * @returns
 */
export function jwtUserId(token: string): string {
    const { sub } = decodeJwt(token)

    if (!sub) {
        throw new Error('token did not contain a subject field')
    }

    return sub
}

/**
 * Determine if a given JWT is still valid based on its expiry time.
 *
 * @param token a base64 encoded JWT token
 * @returns true if the token is expired, false if not
 */
export function jwtExpired(token: string): boolean {
    try {
        const payload = decodeJwt(token)
        const now = Math.floor(Date.now() / 1000)
        return typeof payload.exp === 'number' && payload.exp <= now
    } catch {
        return true
    }
}
