// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import {
    type TransferInstructionView,
    TokenStandardService,
} from '@canton-network/core-ledger-client'

export type Transfer = {
    contractId: string
    sender: string
    receiver: string
    instrumentId: {
        admin: string
        id: string
    }
    amount: string
    memo?: string

    incoming: boolean
    status: 'pending' | 'accepted' | 'withdrawn' | 'rejected' | 'expired'
}

export const toTransfer = ({
    party,
    contractId,
    interfaceViewValue,
}: {
    party: PartyId
    contractId: string
    interfaceViewValue: TransferInstructionView
}): Transfer => {
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
        status: 'pending',
    }
}
