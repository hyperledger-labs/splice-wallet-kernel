// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { AuthService } from '@canton-network/core-wallet-auth'
import { Auth, Store } from '@canton-network/core-wallet-store'
import { decodeJwt } from 'jose'
import { Logger } from 'pino'

/**
 * Creates an AuthService that verifies unsafe JWT tokens.
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
            const decoded = decodeJwt(jwt)
            const iss = decoded.iss
            if (!iss) {
                logger.warn('JWT does not contain an issuer')
                return undefined
            }

            const sub = decoded.sub
            if (!sub) {
                logger.warn('JWT does not contain a subject')
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

            if (idp.type !== 'self_signed') {
                logger.warn(
                    `Cannot verify token for non-self-signed IDP: ${iss}`
                )
                return undefined
            }

            // TODO: Verify JWT signature using idp.clientSecret / idp.admin.clientSecret
            return { userId: sub, accessToken: jwt }
        } catch (error) {
            if (error instanceof Error) {
                logger.warn(error, `Failed to verify token: ${error.message}`)
            }
            return undefined
        }
    },
})
