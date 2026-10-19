// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { base64url } from 'jose'
import { LRUCache } from 'typescript-lru-cache'
import { IdpUnavailableError } from './auth-service.js'
import {
    fetchOidcDiscovery,
    fetchOidcUserInfo,
    type OidcDiscovery,
    type OidcUserInfo,
} from './auth-utils.js'

/**
 * How long discovery documents and userinfo responses are reused. Matches
 * jose's default `cacheMaxAge` for remote JWKS.
 */
export const OIDC_CACHE_TTL_MS = 10 * 60 * 1000
const OIDC_CACHE_MAX_ENTRIES = 10_000

/**
 * Identifies an access token without keeping it, so the cache doesn't hold
 * usable tokens after their requests are done.
 */
async function hashToken(accessToken: string): Promise<string> {
    const digest = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(accessToken)
    )
    return base64url.encode(new Uint8Array(digest))
}

/** A discovery document that can be used to verify the issuer's tokens. */
export type VerifiedOidcDiscovery = OidcDiscovery & { jwks_uri: string }

/**
 * Creates an OIDC client that reuses discovery documents and userinfo
 * responses for {@link OIDC_CACHE_TTL_MS}, so the IDP isn't contacted on
 * every request. Failures aren't cached.
 */
export function createOidcClient() {
    const discoveries = new LRUCache<string, VerifiedOidcDiscovery>({
        maxSize: OIDC_CACHE_MAX_ENTRIES,
        entryExpirationTimeInMS: OIDC_CACHE_TTL_MS,
    })
    const userInfos = new LRUCache<string, OidcUserInfo>({
        maxSize: OIDC_CACHE_MAX_ENTRIES,
        entryExpirationTimeInMS: OIDC_CACHE_TTL_MS,
    })

    /**
     * Cached {@link fetchOidcDiscovery}
     *
     * @throws {IdpUnavailableError} If the request fails, or the document's
     * issuer isn't `issuer` or it has no `jwks_uri`
     */
    async function fetchDiscovery(
        configUrl: string,
        issuer: string
    ): Promise<VerifiedOidcDiscovery> {
        const key = `${configUrl}|${issuer}`
        let config = discoveries.get(key)
        if (!config) {
            const fetched = await fetchOidcDiscovery(configUrl)
            // OIDC Discovery 4.3: the document's issuer must be identical to
            // the issuer it was retrieved for, otherwise its JWKS can't be trusted
            if (fetched.issuer !== issuer) {
                throw new IdpUnavailableError(
                    `OIDC discovery document issuer ${fetched.issuer} does not match the identity provider issuer ${issuer}`
                )
            }
            if (!fetched.jwks_uri) {
                throw new IdpUnavailableError(
                    'OIDC discovery document has no jwks_uri'
                )
            }
            config = { ...fetched, jwks_uri: fetched.jwks_uri }
            discoveries.set(key, config)
        }
        return config
    }

    /**
     * Cached {@link fetchOidcUserInfo}
     *
     * @param subject - The verified `sub` of `accessToken`
     * @throws If the response's `sub` isn't `subject`, its claims may be about
     * another user (OpenID Connect Core 1.0, 5.3.2)
     */
    async function fetchUserInfo(
        userinfoEndpoint: string,
        accessToken: string,
        subject: string
    ): Promise<OidcUserInfo> {
        const key = `${userinfoEndpoint}|${subject}|${await hashToken(accessToken)}`
        let userInfo = userInfos.get(key)
        if (!userInfo) {
            userInfo = await fetchOidcUserInfo(userinfoEndpoint, accessToken)
            if (userInfo.sub !== subject) {
                throw new Error(
                    `OIDC userinfo subject ${userInfo.sub} does not match the token subject ${subject}`
                )
            }
            userInfos.set(key, userInfo)
        }
        return userInfo
    }

    return { fetchDiscovery, fetchUserInfo }
}

export type OidcClient = ReturnType<typeof createOidcClient>
