// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Logger } from 'pino'
import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose'
import { AuthService } from '@canton-network/core-wallet-auth'
import { Auth, Store } from '@canton-network/core-wallet-store'

/**
 * Creates an AuthService that verifies JWT tokens using a remote JWK set.
 * @param store - The Store instance to access network configurations.
 * @param logger - Logger instance for logging debug and warning messages.
 * @returns An AuthService implementation that verifies JWT tokens.
 */
export const jwtAuthService = (store: Store, logger: Logger): AuthService => ({
    verifyToken: async (accessToken?: string) => {
        if (!accessToken || !accessToken.startsWith('Bearer ')) {
            return undefined
        }

        const jwt = accessToken.split(' ')[1]
        logger.debug({ jwt }, 'Verifying JWT token')

        try {
            const iss = decodeJwt(jwt).iss
            if (!iss) {
                logger.warn('JWT does not contain an issuer')
                return undefined
            }

            // TODO: change once IDP is decoupled from networks
            const networks = await store.listNetworks()
            const idp: Auth | undefined = networks.find(
                (n) => n.auth.issuer === iss
            )?.auth
            if (!idp) {
                logger.warn(`No identity provider found for issuer: ${iss}`)
                return undefined
            }
            logger.debug(idp, 'Using IDP')
            const response = await fetch(idp.configUrl)
            const config = await response.json()
            const jwks = createRemoteJWKSet(new URL(config.jwks_uri))

            const { payload } = await jwtVerify(jwt, jwks, {
                algorithms: ['RS256'],
            })

            if (!payload.sub) {
                return undefined
            }

            logger.debug(
                { userId: payload.sub, accessToken: jwt },
                'JWT verified'
            )
            return { userId: payload.sub, accessToken: jwt }
        } catch (error) {
            if (error instanceof Error) {
                logger.warn(error, `Failed to verify token: ${error.message}`)
            }
            return undefined
        }
    },
})
