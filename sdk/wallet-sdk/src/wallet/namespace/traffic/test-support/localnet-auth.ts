// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { TokenProviderConfig } from '@canton-network/core-wallet-auth'

/**
 * A self-signed token for `userId`, which is all LocalNet's Ledger API asks
 * for: its participants run with `unsafe-jwt-hmac-256`, so no real issuer is
 * needed to authenticate as one of its users.
 */
export function localNetAuth(userId: string): TokenProviderConfig {
    return {
        method: 'self_signed',
        issuer: 'unsafe-auth',
        credentials: {
            clientId: userId,
            clientSecret: 'unsafe',
            audience: 'https://canton.network.global',
            scope: '',
        },
    }
}
