// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type Logger } from 'pino'
import { PartyId } from '@canton-network/core-types'
import {
    type TransferInstructionView,
    defaultRetryableOptions,
    LedgerClient,
    type Types,
} from '@canton-network/core-ledger-client'
import { TRANSFER_INSTRUCTION_INTERFACE_ID } from '@canton-network/core-token-standard'
import { type Transfer, toTransfer } from '../utils/transfers/transfer.js'

type Event =
    | { type: 'CreatedEvent'; event: Types['CreatedEvent'] }
    | { type: 'ArchivedEvent'; event: Types['ArchivedEvent'] }
    | { type: 'ExercisedEvent'; event: Types['ExercisedEvent'] }

export class TransactionHistoryService {
    private logger: Logger
    private ledgerClient: LedgerClient
    private party: string
    private transfers: Map<string, Transfer> // By contractId
    private unprocessed: Event[]
    private offset: number | undefined

    constructor({
        logger,
        ledgerClient,
        party,
    }: {
        logger: Logger
        ledgerClient: LedgerClient
        party: PartyId
    }) {
        this.logger = logger
        this.ledgerClient = ledgerClient
        this.party = party
        this.transfers = new Map()
        this.unprocessed = []
    }

    private process(event: Event): boolean {
        if (event.type === 'CreatedEvent') {
            for (const interfaceView of event.event.interfaceViews ?? []) {
                const contractId = event.event.contractId
                // TODO: check if this is the right interface?
                if (interfaceView.viewValue) {
                    const transfer = toTransfer({
                        party: this.party,
                        contractId,
                        interfaceViewValue:
                            interfaceView.viewValue as TransferInstructionView,
                    })
                    this.transfers.set(contractId, transfer)
                    return true
                }
            }
        }

        if (event.type === 'ExercisedEvent') {
            if (event.event.choice === 'TransferInstruction_Accept') {
                const contractId = event.event.contractId
                const transfer = this.transfers.get(contractId)
                if (!transfer) return false
                transfer.status = 'accepted'
                return true
            }
        }

        return true // unrecognized, so skip
    }

    private list(): Transfer[] {
        const transfers = [...this.transfers.values()]
        // TODO: sort
        return transfers
    }

    private async getOffset(): Promise<number> {
        if (this.offset !== undefined) return this.offset
        const ledgerEnd = await this.ledgerClient.get('/v2/state/ledger-end')
        this.offset = ledgerEnd.offset
        this.logger.debug({ offset: this.offset }, 'initialized offset')
        return ledgerEnd.offset
    }

    async fetch(): Promise<Transfer[]> {
        // Strategy: fetch N+1 to see if there are more updates than we can
        // process.  Repeat until we have all updates.  Each update will
        // include the offset.  Then we can adjust...
        const offset = await this.getOffset()
        const limit = 2000
        const updates = await this.ledgerClient.postWithRetry(
            '/v2/updates/flats',
            {
                beginExclusive: offset - limit,
                verbose: false, // deprecated in 3.4
                updateFormat: {
                    includeTransactions: {
                        transactionShape: 'TRANSACTION_SHAPE_LEDGER_EFFECTS',
                        eventFormat: {
                            verbose: false,
                            filtersByParty: {
                                [this.party]: {
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
                    limit: `${limit}`,
                },
            }
        )

        let events: Event[] = []
        for (const update of updates) {
            console.log('update', update)
            for (const event of update.update.Transaction?.value.events ?? []) {
                console.log(event)
                if (event.CreatedEvent) {
                    events.push({
                        type: 'CreatedEvent',
                        event: event.CreatedEvent,
                    })
                } else if (event.ExercisedEvent) {
                    events.push({
                        type: 'ExercisedEvent',
                        event: event.ExercisedEvent,
                    })
                }
            }
            if (update.update.OffsetCheckpoint?.value.offset !== undefined) {
                const offset = update.update.OffsetCheckpoint?.value.offset
                if (this.offset === undefined || offset < this.offset)
                    this.offset = offset
            }
        }

        events = [...events, ...this.unprocessed]

        const newUnprocessed = []
        for (const event of events) {
            if (!this.process(event)) newUnprocessed.push(event)
        }

        this.unprocessed = newUnprocessed

        return this.list()
    }
}
