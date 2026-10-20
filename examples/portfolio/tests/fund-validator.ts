// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    getValidatorParty,
    localNetStaticConfig,
    SDK,
    type TokenProviderConfig,
} from '@canton-network/wallet-sdk'
import { globalSynchronizer } from '../src/lib/synchronizer'

const localNetStaticAuth: TokenProviderConfig = {
    method: 'self_signed',
    issuer: 'unsafe-auth',
    credentials: {
        clientId: localNetStaticConfig.LOCALNET_USER_ID,
        clientSecret: 'unsafe',
        audience: 'https://canton.network.global',
        scope: '',
    },
}

/**
 * Fund the validator operator party with amulet.
 *
 */
export const fundValidatorOperator = async (
    amount = '10000'
): Promise<void> => {
    const sdk = await SDK.create({
        auth: localNetStaticAuth,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
        synchronizerId: globalSynchronizer,
        amulet: {
            scanApiUrl: localNetStaticConfig.LOCALNET_SCAN_API_URL,
            auth: localNetStaticAuth,
            registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
        },
    })

    const validatorParty = await getValidatorParty(
        localNetStaticConfig.LOCALNET_APP_VALIDATOR_URL,
        localNetStaticAuth
    )

    await sdk.amulet.tapInternal(amount, { partyId: validatorParty })
}
