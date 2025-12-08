// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { type TransferInstructionView } from '@canton-network/core-ledger-client'
import { TRANSFER_INSTRUCTION_INTERFACE_ID } from '@canton-network/core-token-standard'
import { resolveTokenStandardService } from '../../services'
import { type Transfer, toTransfer } from './transfer.js'

export const getPendingTransfers = async ({
    party,
}: {
    party: PartyId
}): Promise<Transfer[]> => {
    const tokenStandardService = await resolveTokenStandardService()
    const contracts =
        await tokenStandardService.listContractsByInterface<TransferInstructionView>(
            TRANSFER_INSTRUCTION_INTERFACE_ID,
            party
        )
    return contracts.map((c) =>
        toTransfer({
            party,
            contractId: c.contractId,
            interfaceViewValue: c.interfaceViewValue,
        })
    )
}
