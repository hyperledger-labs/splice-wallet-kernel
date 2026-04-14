// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { AuthTokenProvider } from '@canton-network/core-wallet-auth'

const DEFAULT_ISSUER = import.meta.env.VITE_AUTH_ISSUER || 'unsafe-auth'

const DEFAULT_CREDENTIALS = {
    clientId: import.meta.env.VITE_AUTH_CLIENT_ID || 'ledger-api-user',
    clientSecret: import.meta.env.VITE_AUTH_CLIENT_SECRET || 'unsafe',
    audience:
        import.meta.env.VITE_AUTH_AUDIENCE || 'https://canton.network.global',
    scope:
        import.meta.env.VITE_AUTH_SCOPE ||
        'openid daml_ledger_api offline_access',
}

const logger = {
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
}

const tokenProvider = new AuthTokenProvider(
    {
        method: 'self_signed',
        issuer: DEFAULT_ISSUER,
        credentials: DEFAULT_CREDENTIALS,
    },
    logger
)

export async function getAccessToken(): Promise<string> {
    return tokenProvider.getAccessToken()
}

export function getUserId(): string {
    return DEFAULT_CREDENTIALS.clientId
}
