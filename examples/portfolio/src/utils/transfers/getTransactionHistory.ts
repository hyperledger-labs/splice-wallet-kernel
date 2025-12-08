// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import {
    type TransferInstructionView,
    defaultRetryableOptions,
} from '@canton-network/core-ledger-client'
import { TRANSFER_INSTRUCTION_INTERFACE_ID } from '@canton-network/core-token-standard'
import { resolveLedgerClient } from '../../services'
import { type Transfer, toTransfer } from './transfer.js'

export const getTransactionHistory = async ({
    party,
}: {
    party: PartyId
}): Promise<Transfer[]> => {
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
    const out: Transfer[] = []
    for (const update of updates) {
        for (const event of update.update.Transaction?.value.events ?? []) {
            console.log(event)
            if (event.CreatedEvent) {
                for (const interfaceView of event.CreatedEvent.interfaceViews ??
                    []) {
                    const contractId = event.CreatedEvent.contractId
                    // TODO: check if this is the right interface?
                    if (interfaceView.viewValue) {
                        out.push(
                            toTransfer({
                                party,
                                contractId,
                                interfaceViewValue:
                                    interfaceView.viewValue as TransferInstructionView,
                            })
                        )
                    }
                }
            }
        }
    }
    return out
}
