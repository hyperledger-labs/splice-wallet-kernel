// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ClientCredentials } from './auth-service.js'
import { SignJWT } from 'jose'
import { getLogger } from '@logtape/logtape'

export class SelfSignedTokenService {
    private static logger = getLogger([
        'core',
        'wallet-auth',
        'SelfSignedTokenService',
    ])

    static async fetchToken(
        credentials: ClientCredentials,
        issuer: string,
        expirySeconds: number = 3600,
        keyId?: string
    ): Promise<string> {
        const secret = new TextEncoder().encode(credentials.clientSecret)
        const now = Math.floor(Date.now() / 1000)
        const jwt = await new SignJWT({
            sub: credentials.clientId,
            aud: credentials.audience || '',
            scope: credentials.scope || '',
            iat: now,
            exp: now + expirySeconds,
            iss: issuer,
        })
            .setProtectedHeader({
                alg: 'HS256',
                ...(keyId ? { kid: keyId } : {}),
            })
            .sign(secret)

        this.logger.debug('Generated self-signed JWT token')
        return jwt
    }
}
