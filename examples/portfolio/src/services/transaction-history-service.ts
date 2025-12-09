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

type FiltersByParty = Types['Map_Filters']

type Update = Types['JsGetUpdatesResponse']

type Event =
    | { type: 'CreatedEvent'; event: Types['CreatedEvent'] }
    | { type: 'ArchivedEvent'; event: Types['ArchivedEvent'] }
    | { type: 'ExercisedEvent'; event: Types['ExercisedEvent'] }

const updateOffset = (update: Update): number | undefined => {
    return (
        update.update.OffsetCheckpoint?.value.offset ??
        update.update.Reassignment?.value.offset ??
        update.update.TopologyTransaction?.value.offset ??
        update.update.Transaction?.value.offset
    )
}

const paginateUpdates = async function* ({
    logger,
    ledgerClient,
    beginExclusive,
    endExclusive,
    filtersByParty,
}: {
    logger: Logger
    ledgerClient: LedgerClient
    beginExclusive: number
    endExclusive: number
    filtersByParty: FiltersByParty
}): AsyncGenerator<Update[], void, void> {
    const limit = 2 // just to test
    let more = true
    while (more) {
        const updates = await ledgerClient.postWithRetry(
            '/v2/updates',
            {
                beginExclusive,
                verbose: false, // deprecated in 3.4
                updateFormat: {
                    includeTransactions: {
                        transactionShape: 'TRANSACTION_SHAPE_LEDGER_EFFECTS',
                        eventFormat: {
                            verbose: false,
                            filtersByParty,
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

        if (updates.length == 0) {
            more = false
        } else {
            // Filter out updates before endExclusive.  If we received any at
            // or after endExclusive, we immediately know that we won't have
            // more pages.
            const relevantUpdates: Update[] = []
            let latestOffset: number | undefined = undefined
            for (const update of updates) {
                const offset = updateOffset(update)
                if (
                    offset &&
                    (latestOffset !== null || offset >= latestOffset)
                ) {
                    latestOffset = offset
                }
                if (offset && offset >= endExclusive) {
                    more = false
                } else {
                    relevantUpdates.push(update)
                }
            }

            if (latestOffset === undefined) {
                logger.error('no events with an offset, skipping')
            } else if (latestOffset > beginExclusive) {
                beginExclusive = latestOffset
            }

            yield relevantUpdates
        }
    }
}

export class TransactionHistoryService {
    private logger: Logger
    private ledgerClient: LedgerClient
    private party: string
    private transfers: Map<string, Transfer> // By contractId
    private unprocessed: Event[]
    private oldestOffset: number | undefined

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

    private async getOldestOffset(): Promise<number> {
        if (this.oldestOffset !== undefined) return this.oldestOffset
        const ledgerEnd = await this.ledgerClient.get('/v2/state/ledger-end')
        this.oldestOffset = ledgerEnd.offset
        return ledgerEnd.offset
    }

    async fetch(): Promise<Transfer[]> {
        // Strategy: fetch N+1 to see if there are more updates than we can
        // process.  Repeat until we have all updates.  Each update will
        // include the offset.  Then we can adjust...
        const endExclusive = await this.getOldestOffset()
        const beginExclusive = Math.max(0, endExclusive - 10 - 1)
        this.logger.debug({ beginExclusive }, 'fetching older transactions')
        for await (const updates of paginateUpdates({
            logger: this.logger,
            ledgerClient: this.ledgerClient,
            beginExclusive,
            endExclusive,
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
        })) {
            let events: Event[] = []
            for (const update of updates) {
                console.log('update', update)
                for (const event of update.update.Transaction?.value.events ??
                    []) {
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
            }

            events = [...events, ...this.unprocessed]

            const newUnprocessed = []
            for (const event of events) {
                if (!this.process(event)) newUnprocessed.push(event)
            }

            this.unprocessed = newUnprocessed
        }
        this.oldestOffset = beginExclusive + 1

        return this.list()
    }
}
