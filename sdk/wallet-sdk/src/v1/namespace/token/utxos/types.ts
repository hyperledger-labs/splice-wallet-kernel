// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { Holding, PrettyContract } from '@canton-network/core-tx-parser'

export type MergeUtxosParams = {
    partyId: PartyId
    inputUtxos?: PrettyContract<Holding>[]
    nodeLimit?: number
    memo?: string
}

/**
 * @param includeLocked defaulted to true, this will include locked UTXOs.
 * @param limit optional limit for number of UTXOs to return.
 * @param offset optional offset to list utxos from, default is latest.
 * @param partyId party to list utxos
 * @param continueUntilCompletion optional search the whole ledger for active contracts. Use only when the amount of contracts exceeds the limit defined in http-list-max-elements-limit
 */
export type ListHoldingsParams = {
    partyId: PartyId
    includeLocked?: boolean
    limit?: number
    offset?: number
    continueUntilCompletion?: boolean
}
