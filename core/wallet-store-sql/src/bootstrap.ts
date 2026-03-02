// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Kysely } from 'kysely'
import { StoreSql } from './store-sql.js'
import { BootstrapConfig } from '@canton-network/core-wallet-store'
import { Logger } from 'pino'
import { DB } from './schema'

export async function bootstrap(
    db: Kysely<DB>,
    config: BootstrapConfig,
    logger: Logger
): Promise<void> {
    const store = new StoreSql(db, logger)

    // Load all IDPs from config into the store
    await Promise.all(config.idps.map((idp) => store.addIdp(idp)))

    // Load all networks from config into the store
    await Promise.all(
        config.networks.map((network) => store.addNetwork(network))
    )
}
