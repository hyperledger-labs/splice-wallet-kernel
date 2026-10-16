// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    type AuthContext,
    type AuthService,
    type Idp,
    resolveUserEmail,
} from '@canton-network/core-wallet-auth'
import type { Store } from '@canton-network/core-wallet-store'
import {
    createRemoteJWKSet,
    decodeJwt,
    decodeProtectedHeader,
    importJWK,
    jwtVerify,
    base64url,
    type JWTPayload,
} from 'jose'
import type { Logger } from 'pino'

function getEmail(value: unknown): string | undefined {
    if (typeof value !== 'string' || value.length === 0) {
        return undefined
    }

    return value
}

/**
 * Verifies a self-signed token against the secret of the network named by
 * the `kid` header, and rejects it if that network belongs to another IDP.
 */
async function verifySelfSignedToken(
    jwt: string,
    idp: Extract<Idp, { type: 'self_signed' }>,
    store: Store,
    logger: Logger
): Promise<AuthContext | undefined> {
    const { kid } = decodeProtectedHeader(jwt)
    if (!kid) {
        logger.warn('Self-signed JWT does not contain a kid header')
        return undefined
    }

    const network = await store.getNetworkForTokenVerification(kid)
    if (!network || network.auth.method !== 'self_signed') {
        logger.warn({ kid }, 'No self-signed network has this network id')
        return undefined
    }

    if (network.identityProviderId !== idp.id) {
        logger.warn(
            { kid, networkId: network.id, idpId: idp.id },
            'JWT network id belongs to a different identity provider'
        )
        return undefined
    }

    const auth = network.auth
    const { payload } = await jwtVerify(
        jwt,
        new TextEncoder().encode(auth.clientSecret),
        {
            algorithms: ['HS256'],
            issuer: idp.issuer,
            audience: auth.audience,
        }
    )

    if (!payload.sub) {
        logger.warn('JWT does not contain a subject')
        return undefined
    }

    const email = getEmail(payload.email)
    return {
        userId: payload.sub,
        accessToken: jwt,
        ...(email ? { email } : {}),
    }
}

function getSelfIssuedUserId(payload: JWTPayload): string | undefined {
    const daml = payload['daml.com']
    if (daml === null || typeof daml !== 'object' || Array.isArray(daml)) {
        return undefined
    }

    const usr = (daml as Record<string, unknown>).usr
    if (typeof usr !== 'string' || usr.length === 0) {
        return undefined
    }

    return usr
}

function normalizeAudienceClaim(value: JWTPayload['aud']): string[] {
    if (typeof value === 'string') {
        return [value]
    }

    if (Array.isArray(value)) {
        return value
    }

    return []
}

// wallet.publicKey is 32 raw Ed25519 bytes as standard base64. jwtVerify
// wants a JWK: OKP = octet key pair, crv names Ed25519, x is the same
// point in base64url (RFC 8037).
async function ed25519KeyFromWalletPublicKey(publicKey: string) {
    const raw = Buffer.from(publicKey, 'base64')
    if (raw.length !== 32) {
        throw new Error(
            `Wallet public key must be 32 raw bytes, got ${raw.length}`
        )
    }

    return importJWK(
        {
            kty: 'OKP',
            crv: 'Ed25519',
            x: base64url.encode(raw),
        },
        'EdDSA'
    )
}

/**
 * Verifies a self-issued token (iss === sub) against the party's wallet
 * public key. The wallet is found via daml.com.usr, sub, and aud
 * (exactly one self_issued network).
 */
async function verifySelfIssuedToken(
    jwt: string,
    payload: JWTPayload,
    store: Store,
    logger: Logger
): Promise<AuthContext | undefined> {
    const partyId = payload.sub
    const userId = getSelfIssuedUserId(payload)
    if (!partyId || !userId) {
        logger.warn('Self-issued JWT is missing sub or daml.com.usr')
        return undefined
    }

    const wallet = await store.getWalletByJwt(
        userId,
        partyId,
        normalizeAudienceClaim(payload.aud)
    )
    if (!wallet) {
        logger.warn(
            { userId, partyId },
            'No wallet found for self-issued token'
        )
        return undefined
    }

    if (!wallet.isAuthParty) {
        logger.warn(
            { userId, partyId },
            'Wallet is not an auth party for self-issued tokens'
        )
        return undefined
    }

    const jwk = await ed25519KeyFromWalletPublicKey(wallet.publicKey)

    await jwtVerify(jwt, jwk, {
        algorithms: ['EdDSA'],
        requiredClaims: ['exp'],
    })

    const email = getEmail(payload.email)
    return {
        userId: wallet.userId,
        accessToken: jwt,
        ...(email ? { email } : {}),
    }
}

/**
 * Creates an AuthService that verifies JWT tokens, using a remote JWK set for
 * oauth identity providers, the network's secret for self_signed ones, and the
 * party's wallet public key for self-issued ones (iss === sub).
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

            if (iss === decoded.sub) {
                return await verifySelfIssuedToken(jwt, decoded, store, logger)
            }

            const idps = await store.listIdps()
            const idp = idps.find(
                (i): i is Exclude<Idp, { type: 'self_issued' }> =>
                    i.type !== 'self_issued' && i.issuer === iss
            )

            if (!idp) {
                logger.warn(`No identity provider found for issuer: ${iss}`)
                return undefined
            }

            if (!decoded.scope && !decoded.scp) {
                logger.warn('JWT does not contain a scope claim')
                return undefined
            }

            if (idp.type == 'self_signed') {
                return await verifySelfSignedToken(jwt, idp, store, logger)
            }
            logger.debug({ idp }, 'Using IDP')
            const response = await fetch(idp.configUrl)
            const config = await response.json()
            const jwks = createRemoteJWKSet(new URL(config.jwks_uri))

            const { payload } = await jwtVerify(jwt, jwks, {
                algorithms: ['RS256'],
            })

            if (!payload.sub) {
                return undefined
            }

            const networks = await store.listNetworks()
            const networksForIdp = networks.filter(
                (n) => n.identityProviderId === idp.id
            )
            const expectedAudiences = networksForIdp
                .map((n) => n.auth.audience)
                .filter((aud): aud is string => aud !== undefined && aud !== '')

            if (expectedAudiences.length === 0) {
                logger.warn(
                    `No networks configured for IDP ${idp.id}, cannot validate audience`
                )
                return undefined
            }

            const tokenAudiences = normalizeAudienceClaim(payload.aud)
            if (tokenAudiences.length === 0) {
                logger.warn('JWT does not contain an audience claim')
                return undefined
            }

            const audMatch = tokenAudiences.some((aud) =>
                expectedAudiences.includes(aud)
            )
            if (!audMatch) {
                logger.warn(
                    {
                        tokenAudiences,
                        expectedAudiences,
                    },
                    'JWT audience does not match any configured network'
                )
                return undefined
            }

            logger.debug(
                {
                    userId: payload.sub,
                    accessToken: jwt,
                    email: getEmail(decoded.email),
                },
                'JWT verified'
            )

            const authContext = {
                userId: payload.sub,
                accessToken: jwt,
            }

            const email =
                getEmail(decoded.email) ??
                (await resolveUserEmail(authContext, idp))
            return email ? { ...authContext, email } : authContext
        } catch (error) {
            if (error instanceof Error) {
                logger.warn(error, `Failed to verify token: ${error.message}`)
            }
            return undefined
        }
    },
})
