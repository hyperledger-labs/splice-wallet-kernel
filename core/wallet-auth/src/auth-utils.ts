// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { decodeJwt } from 'jose'
import { z } from 'zod'
import { IdpUnavailableError, type AuthContext } from './auth-service.js'
import { providerErrors } from '@canton-network/core-rpc-errors'
import type { Idp } from './config/schema.js'
import { getLogger } from '@logtape/logtape'

export function assertIsConnected(
    authContext: AuthContext | undefined
): asserts authContext is AuthContext {
    if (!authContext) {
        throw providerErrors.unauthorized({
            message: 'User is not connected',
        })
    }
}

export function assertConnected(
    authContext: AuthContext | undefined
): AuthContext {
    assertIsConnected(authContext)
    return authContext
}

/**
 * Extract a User ID from the `sub` claim of a JWT. Throws if `sub` is missing.
 *
 * @param token a base64 encoded JWT token
 * @returns
 */
export function jwtUserId(token: string): string {
    const { sub } = decodeJwt(token)

    if (!sub) {
        throw new Error('token did not contain a subject field')
    }

    return sub
}

/**
 * Extract the optional `email` claim from a JWT.
 *
 * @param token a base64 encoded JWT token
 * @returns email when present, otherwise undefined
 */
export function jwtUserEmail(token: string): string | undefined {
    const { email } = decodeJwt(token)

    if (typeof email !== 'string' || email.length === 0) {
        return undefined
    }

    return email
}

/**
 * The parts of the OIDC discovery document (/.well-known/openid-configuration)
 * we rely on. Every field is optional because IDPs differ in what they expose;
 * callers must check the fields they need.
 * https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata
 */
export const oidcDiscoverySchema = z.looseObject({
    issuer: z.string().optional(),
    token_endpoint: z.string().optional(),
    userinfo_endpoint: z.string().optional(),
    jwks_uri: z.string().optional(),
})
export type OidcDiscovery = z.infer<typeof oidcDiscoverySchema>

/**
 * The UserInfo claims we rely on, other standard claims are passed through
 * untouched. Only `sub` is required by the spec; `email_verified` and friends
 * are deliberately not validated since IDPs disagree on their type (e.g. the
 * string "true").
 * https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
 */
export const oidcUserInfoSchema = z.looseObject({
    sub: z.string(),
    name: z.string().optional(),
    preferred_username: z.string().optional(),
    email: z.string().optional(),
})
export type OidcUserInfo = z.infer<typeof oidcUserInfoSchema>

/**
 * The successful response of an OAuth token endpoint.
 * https://datatracker.ietf.org/doc/html/rfc6749#section-5.1
 */
export const oidcTokenResponseSchema = z.looseObject({
    access_token: z.string().min(1),
})
export type OidcTokenResponse = z.infer<typeof oidcTokenResponseSchema>

/**
 * Validate a JSON response received from an IDP, throwing a readable error
 * instead of a raw ZodError.
 */
export function parseIdpResponse<T extends z.ZodType>(
    schema: T,
    data: unknown,
    description: string
): z.infer<T> {
    const result = schema.safeParse(data)
    if (!result.success) {
        throw new Error(
            `Invalid ${description}: ${z.prettifyError(result.error)}`
        )
    }
    return result.data
}

/**
 * Fetches and validates the OIDC discovery document.
 *
 * @param configUrl - The OIDC discovery document URL (/.well-known/openid-configuration)
 * @throws {IdpUnavailableError} If the request fails or the response is not a valid discovery document
 */
export async function fetchOidcDiscovery(
    configUrl: string
): Promise<OidcDiscovery> {
    let response: Response
    try {
        response = await fetch(configUrl, {
            headers: { Accept: 'application/json' },
        })
    } catch (error) {
        throw new IdpUnavailableError(
            `Failed to fetch OIDC discovery document: ${error instanceof Error ? error.message : String(error)}`,
            { cause: error }
        )
    }
    if (!response.ok) {
        throw new IdpUnavailableError(
            `Failed to fetch OIDC discovery document: ${response.status} ${response.statusText}`
        )
    }

    try {
        return parseIdpResponse(
            oidcDiscoverySchema,
            await response.json(),
            'OIDC discovery document'
        )
    } catch (error) {
        throw new IdpUnavailableError(
            `Failed to parse OIDC discovery document: ${error instanceof Error ? error.message : String(error)}`,
            { cause: error }
        )
    }
}

/**
 * Fetches user claims from the OIDC UserInfo endpoint.
 * Discovers the endpoint via the OIDC discovery document at configUrl.
 *
 * @param configUrl   - The OIDC discovery document URL (/.well-known/openid-configuration)
 * @param accessToken - The user's bearer access token
 * @returns The UserInfo claims, or undefined if the IDP does not expose a userinfo endpoint
 * @throws If any network request fails or a response is malformed
 */
export async function fetchOidcUserInfo(
    configUrl: string,
    accessToken: string
): Promise<OidcUserInfo | undefined> {
    const config = await fetchOidcDiscovery(configUrl)
    if (!config.userinfo_endpoint) {
        return undefined
    }

    const userInfoResponse = await fetch(config.userinfo_endpoint, {
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
    })
    if (!userInfoResponse.ok) {
        throw new Error(
            `Failed to fetch OIDC userinfo: ${userInfoResponse.status} ${userInfoResponse.statusText}`
        )
    }

    return parseIdpResponse(
        oidcUserInfoSchema,
        await userInfoResponse.json(),
        'OIDC userinfo response'
    )
}

/**
 * Resolve the user email from the OIDC userinfo endpoint.
 *
 * @param authContext - The authentication context
 * @param idp - The IDP configuration
 * @returns The user email, or undefined if the email is not found
 */
export async function resolveUserEmail(
    authContext: AuthContext,
    idp: Idp
): Promise<string | undefined> {
    if (authContext.email) {
        return authContext.email
    }

    try {
        if (idp.type !== 'oauth') {
            return undefined
        }

        const userInfo = await fetchOidcUserInfo(
            idp.configUrl,
            authContext.accessToken
        )
        return userInfo?.email
    } catch (error) {
        const logger = getLogger(['core', 'wallet-auth', 'resolveUserEmail'])
        logger.warn('Failed to resolve user email from OIDC userinfo', {
            error,
        })
        return undefined
    }
}

/**
 * Determine if a given JWT is still valid based on its expiry time.
 *
 * @param token a base64 encoded JWT token
 * @returns true if the token is expired, false if not
 */
export function jwtExpired(token: string): boolean {
    try {
        const payload = decodeJwt(token)
        const now = Math.floor(Date.now() / 1000)
        return typeof payload.exp === 'number' && payload.exp <= now
    } catch {
        return true
    }
}
