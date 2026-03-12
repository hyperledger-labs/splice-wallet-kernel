// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Logger } from '@canton-network/core-types'
import {
    AccessTokenProvider,
    AuthContext,
    ClientCredentials,
} from './auth-service'
import { jwtExpired, jwtUserId } from './auth-utils'
import { clientCredentialsService } from './client-credentials-service'
import { SelfSignedTokenService } from './self-signed-token-service'
import { Auth, Idp } from './config/schema'

type TokenProviderConfig =
    | {
          method: 'static'
          token: string
      }
    | {
          method: 'self_signed'
          issuer: string
          credentials: ClientCredentials
      }
    | {
          method: 'client_credentials'
          configUrl: string
          credentials: ClientCredentials
      }

/**
 * AuthTokenProvider provides some common functionality across token providers.
 *
 *  1. Token caching: tokens are cached in-memory, so long as the token lifespan is not expired.
 *  2. Context retrieval: deriving a user context from the stored access token.
 *
 *
 * The following programmatic methods of token fetching are supported:
 *
 *  - `static`: a fixed, in-memory token. Only used for compatibility, it will totally break for expired tokens.
 *  - `self_signed`: only for development purposes, used for Canton setups that accept HMAC256 self signed tokens.
 *  - `client_credentials`: used to programmatically acquire tokens via oauth2, a.k.a "machine-to-machine" tokens.
 */
export class AuthTokenProvider implements AccessTokenProvider {
    private cachedToken: string | undefined

    constructor(
        protected readonly config: TokenProviderConfig,
        protected logger: Logger
    ) {}

    static fromToken(token: string, logger: Logger): AuthTokenProvider {
        return new AuthTokenProvider({ method: 'static', token }, logger)
    }

    static fromGatewayConfig(
        idp: Idp,
        auth: Auth,
        logger: Logger
    ): AuthTokenProvider {
        if (auth.method === 'self_signed') {
            new AuthTokenProvider(
                {
                    method: auth.method,
                    issuer: auth.issuer,
                    credentials: {
                        clientId: auth.clientId,
                        clientSecret: auth.clientSecret,
                        scope: auth.scope,
                        audience: auth.audience,
                    },
                },
                logger
            )
        }

        if (auth.method === 'client_credentials') {
            if (idp.type === 'oauth')
                new AuthTokenProvider(
                    {
                        method: auth.method,
                        configUrl: idp.configUrl,
                        credentials: {
                            clientId: auth.clientId,
                            clientSecret: auth.clientSecret,
                            scope: auth.scope,
                            audience: auth.audience,
                        },
                    },
                    logger
                )
            else {
                throw new Error(
                    `IDP type ${idp.type} not supported for client_credentials auth`
                )
            }
        }

        throw new Error(
            `Auth method ${auth.method} not supported for programmatic access token`
        )
    }

    protected async _fetchToken(): Promise<string> {
        this.logger.debug('Fetching user auth token')

        switch (this.config.method) {
            case 'static':
                return this.config.token
            case 'self_signed':
                return SelfSignedTokenService.fetchToken(
                    this.logger,
                    this.config.credentials,
                    this.config.issuer
                )
            case 'client_credentials':
                return clientCredentialsService(
                    this.config.configUrl,
                    this.logger
                ).fetchToken(this.config.credentials)
        }
    }

    /**
     *
     * @returns A valid JWT token retrieved according to the auth configuration given.
     */
    public async getAccessToken(): Promise<string> {
        if (this.cachedToken && jwtExpired(this.cachedToken)) {
            return this.cachedToken
        } else {
            const newToken = await this._fetchToken()
            if (jwtExpired(newToken)) {
                throw new Error(
                    'Attempted to refresh a token, but it came back expired.'
                )
            }

            this.cachedToken = newToken
            return newToken
        }
    }

    /**
     *
     * @returns An AuthContext containing a valid token and userId.
     */
    public async getAuthContext(): Promise<AuthContext> {
        const accessToken = await this.getAccessToken()
        const userId = jwtUserId(accessToken)

        return { accessToken, userId }
    }
}
