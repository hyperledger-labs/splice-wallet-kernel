// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Logger } from '@canton-network/core-types'
import { AccessTokenProvider } from './auth-service.js'
import { Auth, Idp, SelfSignedAuth } from './config/schema.js'
import { AuthTokenProviderSelfSigned } from './auth-token-provider-self-signed.js'
import { clientCredentialsService } from './client-credentials-service.js'

export class AuthTokenProvider implements AccessTokenProvider {
    constructor(
        private idp: Idp,
        private auth: Auth,
        private adminAuth: Auth,
        private logger: Logger
    ) {}

    async getUserAccessToken(): Promise<string> {
        this.logger.debug('Fetching user auth token')
        if (this.auth.method === 'self_signed')
            return new AuthTokenProviderSelfSigned(
                this.auth,
                this.adminAuth as SelfSignedAuth,
                this.logger
            ).getUserAccessToken()

        if (this.auth.method === 'client_credentials') {
            if (this.idp.type === 'oauth')
                return clientCredentialsService(
                    this.idp.configUrl,
                    this.logger
                ).fetchToken({
                    clientId: this.auth.clientId,
                    clientSecret: this.auth.clientSecret,
                    scope: this.auth.scope,
                    audience: this.auth.audience,
                })
            else {
                throw new Error(
                    `IDP type ${this.idp.type} not supported for client_credentials auth`
                )
            }
        }

        throw new Error(
            `Auth method ${this.auth.method} not supported for user access token`
        )
    }

    async getAdminAccessToken(): Promise<string> {
        this.logger.debug('Fetching admin auth token')
        if (this.adminAuth.method === 'self_signed')
            return new AuthTokenProviderSelfSigned(
                this.auth as SelfSignedAuth,
                this.adminAuth as SelfSignedAuth,
                this.logger
            ).getAdminAccessToken()

        if (!this.adminAuth) {
            throw new Error(
                `No admin credentials configured for auth type ${this.auth.method}`
            )
        }

        if (this.adminAuth.method === 'client_credentials') {
            if (this.idp.type === 'oauth')
                return clientCredentialsService(
                    this.idp.configUrl,
                    this.logger
                ).fetchToken({
                    clientId: this.adminAuth.clientId,
                    clientSecret: this.adminAuth.clientSecret,
                    scope: this.adminAuth.scope,
                    audience: this.adminAuth.audience,
                })
            else {
                throw new Error(
                    `IDP type ${this.idp.type} not supported for client_credentials auth`
                )
            }
        } else {
            throw new Error(
                `Auth method ${this.auth.method} not supported for admin access token`
            )
        }
    }
}
