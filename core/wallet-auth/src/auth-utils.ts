// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { decodeJwt } from 'jose'
import { z } from 'zod'
import { IdpUnavailableError, type AuthContext } from './auth-service.js'
import { providerErrors } from '@canton-network/core-rpc-errors'

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
 * Extract the expiry from the `exp` claim of a JWT. Throws if `exp` is missing.
 *
 * @param token a base64url encoded JWT token
 * @returns the expiry
 */
export function jwtExpiresAt(token: string): Date {
    const { exp } = decodeJwt(token)

    if (typeof exp !== 'number') {
        throw new Error('token did not contain an expiry field')
    }

    return new Date(exp * 1000)
}

/**
 * An invalid endpoint is treated as missing, so it only fails the callers
 * that actually need it
 */
const endpointSchema = z
    .url({ protocol: /^https?$/ })
    .optional()
    .catch(undefined)

/**
 * The parts of the OIDC discovery document (/.well-known/openid-configuration)
 * we rely on. Every field is optional because IDPs differ in what they expose;
 * callers must check the fields they need.
 * https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata
 */
export const oidcDiscoverySchema = z.looseObject({
    issuer: z.string().optional(),
    authorization_endpoint: endpointSchema,
    token_endpoint: endpointSchema,
    userinfo_endpoint: endpointSchema,
    jwks_uri: endpointSchema,
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

    let data: unknown
    try {
        data = await response.json()
    } catch (error) {
        throw new IdpUnavailableError(
            `Failed to parse OIDC discovery document: ${error instanceof Error ? error.message : String(error)}`,
            { cause: error }
        )
    }

    try {
        return parseIdpResponse(
            oidcDiscoverySchema,
            data,
            'OIDC discovery document'
        )
    } catch (error) {
        throw new IdpUnavailableError(
            error instanceof Error ? error.message : String(error),
            { cause: error }
        )
    }
}

/**
 * Fetches user claims from an OIDC UserInfo endpoint.
 *
 * @param userinfoEndpoint - The `userinfo_endpoint` from the discovery document
 * @param accessToken      - The user's bearer access token
 * @returns The UserInfo claims
 * @throws If the request fails or the response is malformed
 */
export async function fetchOidcUserInfo(
    userinfoEndpoint: string,
    accessToken: string
): Promise<OidcUserInfo> {
    const userInfoResponse = await fetch(userinfoEndpoint, {
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
 * Determine whether a string can be decoded as a JWT at all.
 *
 * `jwtExpired` folds "expired" and "not a JWT" into the same `true`, which is the right call for
 * its own question but leaves a caller unable to tell a token that aged out from one that was
 * never a token. This answers that second question.
 *
 * @param token a base64 encoded JWT token
 * @returns true if the token's payload can be decoded, false if not
 */
export function jwtDecodable(token: string): boolean {
    try {
        decodeJwt(token)
        return true
    } catch {
        return false
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
