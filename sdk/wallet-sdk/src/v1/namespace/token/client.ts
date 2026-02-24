// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { WalletSdkContext } from '../../sdk'
import { TokenStandardService } from '@canton-network/core-token-standard-service'
import { HOLDING_INTERFACE_ID } from '@canton-network/core-token-standard'
import { Holding } from '@canton-network/core-tx-parser'

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

export class Token {
    constructor(private readonly sdkContext: WalletSdkContext) {}

    /**
     * Lists all holding UTXOs for the current party.
     * @param partyId
     * @returns  A promise that resolves to an array of holding UTXOs.
     */
    async utxos(params: ListHoldingsParams) {
        const {
            partyId,
            includeLocked,
            limit,
            offset,
            continueUntilCompletion,
        } = params
        const utxos =
            await this.sdkContext.tokenStandardService.listContractsByInterface<Holding>(
                HOLDING_INTERFACE_ID,
                partyId,
                limit,
                offset,
                continueUntilCompletion
            )

        const currentTime = new Date()

        const filteredUtxos = includeLocked
            ? utxos
            : utxos.filter(
                  (utxo) =>
                      !TokenStandardService.isHoldingLocked(
                          utxo.interfaceViewValue,
                          currentTime
                      )
              )

        return filteredUtxos
    }
}
