// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Kysely } from 'kysely'
import { StoreSql } from './store-sql.js'
import { StoreConfig } from '@canton-network/core-wallet-store'
import { Logger } from 'pino'
import { DB } from './schema'

export async function bootstrap(
    db: Kysely<DB>,
    config: StoreConfig,
    logger: Logger
): Promise<void> {
    const store = new StoreSql(db, logger)
    await Promise.all(
        config.networks.map((network) => store.addNetwork(network))
    )
}
