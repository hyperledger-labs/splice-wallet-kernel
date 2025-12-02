// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { pino } from 'pino'
import { PartyId } from '@canton-network/core-types'
import {
    type PrettyContract,
    type TransferInstructionView,
} from '@canton-network/core-ledger-client'
import { TRANSFER_INSTRUCTION_INTERFACE_ID } from '@canton-network/core-token-standard'
import { createTokenStandardService } from './createClients.js'

export type PendingTransfer = {
    contractId: string
    amount: string
    sender: string
    receiver: string
    incoming: boolean
}

const toPendingTransfer = (
    party: string,
    contract: PrettyContract<TransferInstructionView>
): PendingTransfer => {
    const { contractId } = contract
    const { amount, sender, receiver } = contract.interfaceViewValue.transfer
    const incoming = party == receiver
    return { contractId, amount, sender, receiver, incoming }
}

export const getPendingTransfers = async ({
    sessionToken,
    party,
}: {
    sessionToken: string
    party: PartyId
}): Promise<PendingTransfer[]> => {
    const logger = pino({ name: 'main', level: 'debug' })
    const { tokenStandardService } = await createTokenStandardService({
        logger,
        sessionToken,
    })
    const contracts =
        await tokenStandardService.listContractsByInterface<TransferInstructionView>(
            TRANSFER_INSTRUCTION_INTERFACE_ID,
            party
        )
    return contracts.map((c) => toPendingTransfer(party, c))
}
