// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { decodeJwt } from 'jose'
import { AuthContext } from './auth-service'
import { providerErrors } from '@canton-network/core-rpc-errors'

export function assertConnected(
    authContext: AuthContext | undefined
): AuthContext {
    if (!authContext) {
        throw providerErrors.unauthorized({
            message: 'User is not connected',
        })
    }
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
 * Standard OIDC UserInfo claims as defined by OpenID Connect Core 1.0.
 * https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
 */
export interface OidcUserInfo {
    sub: string
    name?: string
    given_name?: string
    family_name?: string
    middle_name?: string
    nickname?: string
    preferred_username?: string
    profile?: string
    picture?: string
    website?: string
    email?: string
    email_verified?: boolean
    gender?: string
    birthdate?: string
    zoneinfo?: string
    locale?: string
    phone_number?: string
    phone_number_verified?: boolean
    updated_at?: number
    address?: Record<string, string>
    [key: string]: unknown
}

/**
 * Fetches user claims from the OIDC UserInfo endpoint.
 * Discovers the endpoint via the OIDC discovery document at configUrl.
 *
 * @param configUrl   - The OIDC discovery document URL (/.well-known/openid-configuration)
 * @param accessToken - The user's bearer access token
 * @returns The UserInfo claims, or undefined if the IDP does not expose a userinfo endpoint
 * @throws If any network request fails
 */
export async function fetchOidcUserInfo(
    configUrl: string,
    accessToken: string
): Promise<OidcUserInfo | undefined> {
    const configResponse = await fetch(configUrl)
    if (!configResponse.ok) {
        throw new Error(
            `Failed to fetch OIDC discovery document: ${configResponse.status} ${configResponse.statusText}`
        )
    }

    const config = (await configResponse.json()) as {
        userinfo_endpoint?: string
    }
    if (!config.userinfo_endpoint) {
        return undefined
    }

    const userInfoResponse = await fetch(config.userinfo_endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!userInfoResponse.ok) {
        throw new Error(
            `Failed to fetch OIDC userinfo: ${userInfoResponse.status} ${userInfoResponse.statusText}`
        )
    }

    return (await userInfoResponse.json()) as OidcUserInfo
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
