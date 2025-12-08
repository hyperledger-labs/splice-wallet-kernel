// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { defaultRetryableOptions } from '@canton-network/core-ledger-client'
import { TRANSFER_INSTRUCTION_INTERFACE_ID } from '@canton-network/core-token-standard'
import { resolveLedgerClient } from '../services'

export const getTransactionHistory = async ({
    party,
}: {
    party: PartyId
}): Promise<string[]> => {
    const ledgerClient = await resolveLedgerClient()
    const updates = await ledgerClient.postWithRetry(
        '/v2/updates/flats',
        {
            beginExclusive: 0,
            verbose: false, // deprecated in 3.4
            updateFormat: {
                includeTransactions: {
                    transactionShape: 'TRANSACTION_SHAPE_LEDGER_EFFECTS',
                    eventFormat: {
                        verbose: false,
                        filtersByParty: {
                            [party]: {
                                cumulative: [
                                    {
                                        identifierFilter: {
                                            InterfaceFilter: {
                                                value: {
                                                    interfaceId:
                                                        TRANSFER_INSTRUCTION_INTERFACE_ID,
                                                    includeInterfaceView: true,
                                                    includeCreatedEventBlob: true,
                                                },
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        },
        defaultRetryableOptions,
        {
            query: {
                limit: '32',
            },
        }
    )
    console.log(party)
    console.log(updates)
    return []
}
