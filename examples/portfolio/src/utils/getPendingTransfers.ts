// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import {
    type TransferInstructionView,
    TokenStandardService,
} from '@canton-network/core-ledger-client'
import { TRANSFER_INSTRUCTION_INTERFACE_ID } from '@canton-network/core-token-standard'
import { resolveTokenStandardService } from '../services'

// TODO: move to service now that we export this
export type PendingTransfer = {
    contractId: string
    sender: string
    receiver: string
    instrumentId: {
        admin: string
        id: string
    }
    amount: string
    incoming: boolean
    memo?: string
}

// TODO: move to service now that we export this
export const toPendingTransfer = ({
    party,
    contractId,
    interfaceViewValue,
}: {
    party: string
    contractId: string
    interfaceViewValue: TransferInstructionView
}): PendingTransfer => {
    const { amount, sender, receiver, instrumentId, meta } =
        interfaceViewValue.transfer
    const incoming = party == receiver
    const memo = meta.values[TokenStandardService.MEMO_KEY]
    return {
        contractId,
        sender,
        receiver,
        instrumentId,
        amount,
        incoming,
        memo,
    }
}

export const getPendingTransfers = async ({
    party,
}: {
    party: PartyId
}): Promise<PendingTransfer[]> => {
    const tokenStandardService = await resolveTokenStandardService()
    const contracts =
        await tokenStandardService.listContractsByInterface<TransferInstructionView>(
            TRANSFER_INSTRUCTION_INTERFACE_ID,
            party
        )
    return contracts.map((c) =>
        toPendingTransfer({
            party,
            contractId: c.contractId,
            interfaceViewValue: c.interfaceViewValue,
        })
    )
}
