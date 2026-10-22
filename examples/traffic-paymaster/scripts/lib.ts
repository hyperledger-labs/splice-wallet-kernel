// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { TokenProviderConfig } from '@canton-network/core-wallet-auth'
import { SDK, localNetStaticConfig } from '@canton-network/wallet-sdk'

/** A mebibyte of traffic per Amulet -- the same rate the SDK's own integration test uses. */
export const BYTES_PER_AMULET = '1048576'

/**
 * A self-signed token for `userId`. LocalNet's participants run with
 * `unsafe-jwt-hmac-256`, so no real issuer is needed to authenticate as one
 * of its users -- this is not a pattern to use against anything but LocalNet.
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

/**
 * Picks the Canton Network global synchronizer by name prefix. A traffic-enabled
 * LocalNet connects the participant to more than one synchronizer (e.g.
 * `global-domain::…` and `app-synchronizer::…`), so the SDK refuses to guess
 * which to use unless we tell it. The id's hash suffix changes every run, hence
 * matching on the `global-domain::` prefix rather than a literal id.
 */
function selectGlobalSynchronizer(
    synchronizers: readonly { synchronizerId: string }[]
): string {
    const global = synchronizers.find((s) =>
        s.synchronizerId.startsWith('global-domain::')
    )
    if (global === undefined) {
        throw new Error(
            `No global-domain synchronizer connected. Connected: ${synchronizers
                .map((s) => s.synchronizerId)
                .join(', ')}`
        )
    }
    return global.synchronizerId
}

/** The admin SDK both scripts drive LocalNet through, as the app-user's ledger API user. */
export async function createAdminSdk() {
    const auth = localNetAuth(localNetStaticConfig.LOCALNET_USER_ID)
    return SDK.create({
        auth,
        synchronizerId: selectGlobalSynchronizer,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
        amulet: {
            validatorUrl: localNetStaticConfig.LOCALNET_APP_VALIDATOR_URL,
            scanApiUrl: localNetStaticConfig.LOCALNET_SCAN_API_URL,
            registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
            auth,
        },
        asset: {
            registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
            auth,
        },
        traffic: {
            registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
            auth,
        },
    })
}

export type AdminSdk = Awaited<ReturnType<typeof createAdminSdk>>
