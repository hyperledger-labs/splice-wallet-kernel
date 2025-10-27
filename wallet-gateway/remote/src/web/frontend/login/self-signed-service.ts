// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Logger } from '@canton-network/core-types'
import { ClientCredentials } from '@canton-network/core-wallet-auth'
import { SignJWT } from 'jose'

// TODO: This is a temporary solution
// Instead, refactor this to issue tokens from the backend.
// The backend should thereby be considered as an OIDC-compatiable
// IDP provider and thus implement the neccessary interfaces.
class SelfSignedService {
    constructor(private logger: Logger) {}

    async fetchToken(credentials: ClientCredentials): Promise<string> {
        this.logger.debug('Creating new token')
        const secret = new TextEncoder().encode(credentials.clientSecret)
        const now = Math.floor(Date.now() / 1000)
        const jwt = await new SignJWT({
            sub: credentials.clientId,
            aud: credentials.audience || '',
            iat: now,
            exp: now + 3600, // 1 hour expiry
            iss: 'unsafe-auth',
        })
            .setProtectedHeader({ alg: 'HS256' })
            .sign(secret)

        return jwt
    }
}

export const fetchToken = (credentials: ClientCredentials): Promise<string> =>
    new SelfSignedService(console).fetchToken(credentials)
