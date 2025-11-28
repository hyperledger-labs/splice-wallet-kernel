// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { pino } from 'pino'
import { v4 } from 'uuid'
import { TokenStandardClient } from '@canton-network/core-token-standard'
import { ScanProxyClient } from '@canton-network/core-splice-client'
import { TokenStandardService } from '@canton-network/core-ledger-client'
import { createLedgerClient } from './createLedgerClient.js'

export const tap = async ({
    party,
    sessionToken,
    amount,
}: {
    party: string
    sessionToken: string
    amount: number
}) => {
    const logger = pino({ name: 'main', level: 'debug' })
    const registryUrl = 'http://scan.localhost:4000'
    const tokenStandardClient = new TokenStandardClient(
        registryUrl,
        logger,
        false // isAdmin
    )
    const scanProxyClient = new ScanProxyClient(
        new URL('http://localhost:2000/api/validator'),
        logger,
        false, // isAdmin
        sessionToken
    )

    const ledgerClient = await createLedgerClient({});
    const tokenStandardService = new TokenStandardService(
        ledgerClient,
        scanProxyClient,
        logger,
        undefined!, // access token provider
        false, // isMasterUser
        undefined // scanClient
    )
    const registryInfo = await tokenStandardClient.get(
        '/registry/metadata/v1/info'
    )
    const [tapCommand, disclosedContracts] = await tokenStandardService.createTap(
        party,
        `${amount}`,
        registryInfo.adminId,
        'Amulet',
        registryUrl
    )

    const request = {
        commands: [{ ExerciseCommand: tapCommand }],
        commandId: v4(),
        actAs: [party],
        disclosedContracts,
    }

    const provider = window.canton
    const result = await provider?.request({
        method: 'prepareExecute',
        params: request,
    })
    console.log(result)
}
