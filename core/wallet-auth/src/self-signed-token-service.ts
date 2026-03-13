// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Logger } from '@canton-network/core-types'
import { ClientCredentials } from './auth-service.js'
import { SignJWT } from 'jose'

export class SelfSignedTokenService {
    static async fetchToken(
        logger: Logger,
        credentials: ClientCredentials,
        issuer: string,
        expirySeconds: number = 3600
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
            .setProtectedHeader({ alg: 'HS256' })
            .sign(secret)

        logger.info(`Generated self-signed JWT token: ${jwt}`)
        return jwt
    }
}
