// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { SignJWT } from 'jose'

export interface AuthConfig {
    issuer: string
    clientId: string
    clientSecret: string
    audience: string
    scope: string
}

const DEFAULT_CONFIG: AuthConfig = {
    // Must match an IDP's issuer field in the gateway config (not the network auth issuer)
    issuer: import.meta.env.VITE_AUTH_ISSUER || 'unsafe-auth',
    clientId: import.meta.env.VITE_AUTH_CLIENT_ID || 'ledger-api-user',
    clientSecret: import.meta.env.VITE_AUTH_CLIENT_SECRET || 'unsafe',
    audience:
        import.meta.env.VITE_AUTH_AUDIENCE || 'https://canton.network.global',
    scope:
        import.meta.env.VITE_AUTH_SCOPE ||
        'openid daml_ledger_api offline_access',
}

let cachedToken: string | null = null
let cachedExp = 0

function isExpired(): boolean {
    return Date.now() / 1000 >= cachedExp - 30 // refresh 30s before expiry
}

export async function getAccessToken(
    config: AuthConfig = DEFAULT_CONFIG
): Promise<string> {
    if (cachedToken && !isExpired()) return cachedToken

    const secret = new TextEncoder().encode(config.clientSecret)
    const now = Math.floor(Date.now() / 1000)
    const exp = now + 3600

    const jwt = await new SignJWT({
        sub: config.clientId,
        aud: config.audience,
        scope: config.scope,
        iat: now,
        exp,
        iss: config.issuer,
    })
        .setProtectedHeader({ alg: 'HS256' })
        .sign(secret)

    cachedToken = jwt
    cachedExp = exp
    return jwt
}

export function getUserId(config: AuthConfig = DEFAULT_CONFIG): string {
    return config.clientId
}
