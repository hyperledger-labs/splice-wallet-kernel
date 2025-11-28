// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { pino } from 'pino'
import { HOLDING_INTERFACE_ID } from '@canton-network/core-token-standard'
import { type Holding } from '@canton-network/core-ledger-client'
import { createTokenStandardService } from './createClients.js'

/*
export type Holding = {
    contractId: string
    name?: string
    value: number
    symbol: string
}
*/

export const getHoldings = async ({
    sessionToken,
    party,
}: {
    sessionToken: string
    party: string
}): Promise<Holding[]> => {
    const logger = pino({ name: 'getHoldings', level: 'debug' })

    const { tokenStandardService } = await createTokenStandardService({
        logger,
        sessionToken,
    })

    // TODO: copy more from tokenStandardController
    const utxoContracts =
        await tokenStandardService.listContractsByInterface<Holding>(
            HOLDING_INTERFACE_ID,
            party
        )

    const uniqueContractIds = new Set<string>()
    const uniqueUtxos: Holding[] = []
    for (const utxo of utxoContracts) {
        console.log(utxo)
        if (!uniqueContractIds.has(utxo.contractId)) {
            uniqueContractIds.add(utxo.contractId)
            uniqueUtxos.push({
                ...utxo.interfaceViewValue,
                contractId: utxo.contractId,
            })
        }
    }

    return uniqueUtxos
}
