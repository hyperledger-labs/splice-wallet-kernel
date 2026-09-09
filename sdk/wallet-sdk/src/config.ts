// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { SynchronizerSelector } from './wallet/init/synchronizer.js'

const LOCALNET_APP_VALIDATOR_URL = new URL(
    'http://localhost:2000/api/validator'
)

const LOCALNET_SCAN_API_URL = new URL('http://scan.localhost:4000/api/scan')

const LOCALNET_APP_USER_LEDGER_URL = new URL('http://localhost:2975')
const LOCALNET_APP_PROVIDER_LEDGER_URL = new URL('http://localhost:3975')
const LOCALNET_SV_LEDGER_URL = new URL('http://localhost:4975')

const LOCALNET_TOKEN_STANDARD_URL = new URL('http://localhost:5003')

//scan proxy exposes the registry endpoints as well
const LOCALNET_REGISTRY_API_URL = new URL(
    LOCALNET_APP_VALIDATOR_URL + '/v0/scan-proxy'
)

const LOCALNET_USER_ID = 'ledger-api-user'

export const localNetStaticConfig = {
    LOCALNET_APP_VALIDATOR_URL,
    LOCALNET_SCAN_API_URL,
    LOCALNET_REGISTRY_API_URL,
    LOCALNET_APP_USER_LEDGER_URL,
    LOCALNET_APP_PROVIDER_LEDGER_URL,
    LOCALNET_SV_LEDGER_URL,
    LOCALNET_TOKEN_STANDARD_URL,
    LOCALNET_USER_ID,
}

/**
 * `synchronizerId` selector for `SDK.create` that picks LocalNet's global
 * synchronizer. LocalNet can additionally run an app-synchronizer, and the SDK
 * refuses to guess between them — pass this when your code targets the global one.
 */
export const localNetGlobalSynchronizer: SynchronizerSelector = (
    synchronizers
) => {
    const global = synchronizers.find(
        (s) =>
            s.synchronizerAlias === 'global' ||
            s.synchronizerAlias === 'global-domain'
    )
    if (!global) {
        throw new Error(
            `No global synchronizer among: ${synchronizers
                .map((s) => s.synchronizerAlias)
                .join(', ')}`
        )
    }
    return global.synchronizerId
}
