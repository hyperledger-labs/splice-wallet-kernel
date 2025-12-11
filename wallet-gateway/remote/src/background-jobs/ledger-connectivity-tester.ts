// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LedgerClient } from '@canton-network/core-ledger-client'
import { Logger } from 'pino'
import { NetworkCacheStore } from '../cache/network-cache.js'

export async function startLedgerConnectivityTester(
    networkCacheStore: NetworkCacheStore,
    logger: Logger
) {
    const networks = await networkCacheStore.getStore().listNetworks()

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
                    `Failed to connect to ledger at ${network.name}(${network.ledgerApi.baseUrl}): ${JSON.stringify(error)}`
                )
            }

            networkCacheStore.getCache().set(network.id, {
                ...network,
                verified: connectivityCheck,
            })
            logger.info(
                connectivityCheck
                    ? `Network ${network.name} (${network.id}) verified successfully.`
                    : `Network ${network.name} (${network.id}) verification failed.`
            )
        } catch (error) {
            logger.error(
                `Failed to verify network ${network.name} (${network.id}): ${error}`
            )
        }
    })
}
