// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Logger } from '@canton-network/core-types'
import { AccessTokenProvider } from './auth-service.js'
import { Auth } from './config/schema.js'
import { AuthTokenProviderSelfSigned } from './auth-token-provider-self-signed.js'
import { clientCredentialsService } from './client-credentials-service.js'

export class AuthTokenProvider implements AccessTokenProvider {
    constructor(
        private auth: Auth,
        private logger: Logger
    ) {}

    async getUserAccessToken(): Promise<string> {
        this.logger.debug('Fetching user auth token')
        if (this.auth.type === 'self_signed')
            return new AuthTokenProviderSelfSigned(
                this.auth,
                this.logger
            ).getUserAccessToken()

        if (this.auth.type === 'client_credentials')
            return clientCredentialsService(
                this.auth.configUrl,
                this.logger
            ).fetchToken({
                clientId: this.auth.clientId,
                clientSecret: this.auth.clientSecret,
                scope: this.auth.scope,
                audience: this.auth.audience,
            })

        throw new Error(
            `Auth type ${this.auth.type} not supported for user access token`
        )
    }

    async getAdminAccessToken(): Promise<string> {
        this.logger.debug('Fetching admin auth token')
        if (this.auth.type === 'self_signed')
            return new AuthTokenProviderSelfSigned(
                this.auth,
                this.logger
            ).getAdminAccessToken()

        if (!this.auth.admin) {
            throw new Error(
                `No admin credentials configured for auth type ${this.auth.type}`
            )
        }
        return clientCredentialsService(
            this.auth.configUrl,
            this.logger
        ).fetchToken({
            clientId: this.auth.admin.clientId,
            clientSecret: this.auth.admin.clientSecret,
            scope: this.auth.scope,
            audience: this.auth.audience,
        })
    }
}
