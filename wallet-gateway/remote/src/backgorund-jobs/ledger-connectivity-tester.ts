// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LedgerClient } from '@canton-network/core-ledger-client'
import { StoreSql } from '@canton-network/core-wallet-store-sql'
import { Logger } from 'pino'

export async function startLedgerConnectivityTester(
    store: StoreSql,
    logger: Logger
) {
    const networks = await store.listNetworks()

    networks.map(async (network) => {
        try {
            logger.debug(
                `Testing connectivity for network ${network.name} (${network.id})...`
            )

            //connectivity test
            const ledgerClient = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                logger: logger,
            })
            let connectivityCheck = false

            try {
                const version = await ledgerClient.get('/v2/version')
                if (version.version) {
                    connectivityCheck = true
                }
            } catch (error) {
                logger.debug(
                    `Failed to connect to ledger at ${network.ledgerApi.baseUrl}: ${error}`
                )
            }

            await store.updateNetwork({
                ...network,
                verified: connectivityCheck,
            })
            logger.info(
                `Network ${network.name} (${network.id}) verified successfully.`
            )
        } catch (error) {
            logger.error(
                `Failed to verify network ${network.name} (${network.id}): ${error}`
            )
        }
    })
}
