// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    HOLDING_INTERFACE_ID_V2,
    type HoldingView,
} from '@canton-network/core-token-standard-v2'
import { TokenStandardService } from '@canton-network/core-token-standard-service'
import type { TokenNamespaceConfig } from '../../namespace.js'
import type { ListHoldingsParams } from '../../utxos/types.js'

export class UtxoNamespace {
    constructor(private readonly sdkContext: TokenNamespaceConfig) {}

    /**
     * Lists all holding UTXOs for the current party.
     * @param partyId
     * @returns  A promise that resolves to an array of holding UTXOs.
     */
    async list(params: ListHoldingsParams) {
        const {
            partyId,
            includeLocked,
            limit,
            offset,
            continueUntilCompletion,
        } = params
        const utxos =
            await this.sdkContext.tokenStandardService.listContractsByInterface<HoldingView>(
                HOLDING_INTERFACE_ID_V2,
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
                      !TokenStandardService.isHoldingLocked(utxo, currentTime)
              )

        return filteredUtxos
    }
}
