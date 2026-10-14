// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    localNetStaticConfig,
    SDK,
    type TokenProviderConfig,
} from '@canton-network/wallet-sdk'

/**
 * @customize consider switching to another auth method
 */
const auth: TokenProviderConfig = {
    method: 'self_signed',
    issuer: 'unsafe-auth',
    credentials: {
        clientId: localNetStaticConfig.LOCALNET_USER_ID,
        clientSecret: 'unsafe',
        audience: 'https://canton.network.global',
        scope: '',
    },
}

const defaultSdk = await SDK.create({
    auth,
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
})

export default defaultSdk
