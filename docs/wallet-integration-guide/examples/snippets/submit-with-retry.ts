// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetStaticConfig,
    localNetTokenStandardDefault,
} from '@canton-network/wallet-sdk'
import { v4 } from 'uuid'

export default async function () {
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
        tokenStandardFactory: localNetTokenStandardDefault,
    })

    const myParty = global.EXISTING_PARTY_1
    const myPrivateKey = global.EXISTING_PARTY_1_KEYS.privateKey

    await sdk.connect()
    await sdk.setPartyId(myParty)
    await sdk.tokenStandard!.setTransferFactoryRegistryUrl(
        localNetStaticConfig.LOCALNET_REGISTRY_API_URL
    )

    // Retry pattern for handling contention on the ledger
    async function submitWithRetry(
        command: unknown,
        maxRetries = 5
    ): Promise<unknown> {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await sdk.userLedger!.prepareSignExecuteAndWaitFor(
                    command,
                    myPrivateKey,
                    v4()
                )
            } catch (e: unknown) {
                const error = e as { code?: string }
                if (error.code === 'ABORTED' && i < maxRetries - 1) {
                    await new Promise((res) =>
                        setTimeout(res, Math.pow(2, i) * 100)
                    )
                    continue
                }
                throw e
            }
        }
    }

    // Use the retry pattern for a ping command
    const pingCommand = sdk.userLedger!.createPingCommand(
        global.EXISTING_PARTY_2
    )
    await submitWithRetry(pingCommand)
}
