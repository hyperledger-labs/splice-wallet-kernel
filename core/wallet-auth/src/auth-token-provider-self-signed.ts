// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Logger } from '@canton-network/core-types'
import { AccessTokenProvider, ClientCredentials } from './auth-service.js'
import { SelfSignedAuth } from './config/schema.js'
import { SignJWT } from 'jose'

export class AuthTokenProviderSelfSigned implements AccessTokenProvider {
    constructor(
        private auth: SelfSignedAuth,
        private authAdmin: SelfSignedAuth,
        private logger: Logger,
        private expirySeconds: number = 3600
    ) {}

    async getUserAccessToken(): Promise<string> {
        this.logger.debug('Fetching self-signed user auth token')
        return AuthTokenProviderSelfSigned.fetchToken(
            this.logger,
            {
                clientId: this.auth.clientId,
                clientSecret: this.auth.clientSecret,
                scope: this.auth.scope,
                audience: this.auth.audience,
            },
            this.auth.issuer,
            this.expirySeconds
        )
    }

    async getAdminAccessToken(): Promise<string> {
        this.logger.debug('Fetching self-signed admin auth token')
        if (!this.authAdmin) {
            throw new Error('Admin credentials are not configured')
        }
        return AuthTokenProviderSelfSigned.fetchToken(
            this.logger,
            {
                clientId: this.authAdmin.clientId,
                clientSecret: this.authAdmin.clientSecret,
                scope: this.authAdmin.scope,
                audience: this.authAdmin.audience,
            },
            this.authAdmin.issuer,
            this.expirySeconds
        )
    }

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
