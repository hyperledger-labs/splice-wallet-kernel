// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { resolveTransactionHistoryService } from '../../services'
import { type Transfer } from './transfer.js'

export const getTransactionHistory = async ({
    party,
}: {
    party: PartyId
}): Promise<Transfer[]> => {
    const transactionHistoryService = await resolveTransactionHistoryService({
        party,
    })
    return transactionHistoryService.fetch()
}
