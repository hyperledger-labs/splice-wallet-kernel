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
import { type Transfer, toTransfer } from '../models/transfer.js'

type FiltersByParty = Types['Map_Filters']

type Update = Types['JsGetUpdatesResponse']

type Event =
    | { type: 'CreatedEvent'; offset: number; event: Types['CreatedEvent'] }
    | { type: 'ArchivedEvent'; offset: number; event: Types['ArchivedEvent'] }
    | { type: 'ExercisedEvent'; offset: number; event: Types['ExercisedEvent'] }

const updateOffset = (update: Update): number => {
    if ('OffsetCheckpoint' in update.update)
        return update.update.OffsetCheckpoint.value.offset
    if ('Reassignment' in update.update)
        return update.update.Reassignment.value.offset
    if ('TopologyTransaction' in update.update)
        return update.update.TopologyTransaction.value.offset
    if ('Transaction' in update.update)
        return update.update.Transaction.value.offset
    throw new Error('Ledger update is missing an offset')
}

/** Helper function to paginate over all updates in a range. */
const paginateUpdates = async function* ({
    logger,
    ledgerClient,
    beginExclusive,
    endInclusive,
    filtersByParty,
}: {
    logger: Logger
    ledgerClient: LedgerClient
    beginExclusive: number
    endInclusive: number
    filtersByParty: FiltersByParty
}): AsyncGenerator<Update[], void, void> {
    const limit = 32 // just to test
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
            // Filter out updates after endInclusive.  If we received any at
            // or after endInclusive, we immediately know that we won't have
            // more pages.
            const relevantUpdates: Update[] = []
            let latestOffset: number | undefined = undefined
            for (const update of updates) {
                console.log(update)
                const offset = updateOffset(update)
                if (latestOffset !== null || offset >= latestOffset) {
                    latestOffset = offset
                }
                if (offset >= endInclusive) {
                    more = false
                }
                if (offset < endInclusive) {
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

    /** Currently we just store relevant transactions in a map by contractId.
     *   We probably want to move this to a SQLite based format instead. */
    private transfers: Map<string, Transfer> // By contractId

    /** Events that we have retrieved from the ledger but not processed yet
     *   (e.g. an exercise on a contract that we don't know about). */
    private unprocessed: Event[]

    /** The oldest and most recent offset we know about.  If both are set, you
     *   can assume we have gathered all updates in this range. */
    private beginExclusive: number | undefined
    private endInclusive: number | undefined

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
        const contractId = event.event.contractId
        if (event.type === 'CreatedEvent') {
            for (const interfaceView of event.event.interfaceViews ?? []) {
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
            const transfer = this.transfers.get(contractId)
            if (!transfer) return false

            switch (event.event.choice) {
                case 'TransferInstruction_Accept':
                    transfer.status = 'accepted'
                    return true
                case 'TransferInstruction_Reject':
                    transfer.status = 'rejected'
                    return true
                case 'TransferInstruction_Withdraw':
                    transfer.status = 'withdrawn'
                    return true
                case 'TransferInstruction_Update':
                    // TODO: update meta?
                    return false
            }
        }

        return true // unrecognized, so skip
    }

    private async fetchRange({
        beginExclusive,
        endInclusive,
    }: {
        beginExclusive: number
        endInclusive: number
    }): Promise<number> {
        // TODO: check the invariant that this range is adjacent to the
        // current range (this.beginExclusive, this.endInclusive).
        let fetchedUpdates = 0
        for await (const updates of paginateUpdates({
            logger: this.logger,
            ledgerClient: this.ledgerClient,
            beginExclusive,
            endInclusive,
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
            fetchedUpdates += updates.length
            for (const update of updates) {
                if ('Transaction' in update.update) {
                    for (const event of update.update.Transaction?.value
                        .events ?? []) {
                        if ('CreatedEvent' in event) {
                            events.push({
                                type: 'CreatedEvent',
                                offset: updateOffset(update),
                                event: event.CreatedEvent,
                            })
                        } else if ('ExercisedEvent' in event) {
                            events.push({
                                type: 'ExercisedEvent',
                                offset: updateOffset(update),
                                event: event.ExercisedEvent,
                            })
                        } else if ('ArchivedEvent' in event) {
                            events.push({
                                type: 'ArchivedEvent',
                                offset: updateOffset(update),
                                event: event.ArchivedEvent,
                            })
                        }
                    }
                }
            }

            events = [...events, ...this.unprocessed]
            events.sort((e1, e2) => e1.offset - e2.offset)

            const newUnprocessed = []
            for (const event of events) {
                if (!this.process(event)) newUnprocessed.push(event)
            }

            this.unprocessed = newUnprocessed
        }

        // Update the known range.
        if (
            this.beginExclusive === undefined ||
            beginExclusive < this.beginExclusive
        ) {
            this.beginExclusive = beginExclusive
        }
        if (
            this.endInclusive === undefined ||
            endInclusive > this.endInclusive
        ) {
            this.endInclusive = endInclusive
        }

        this.logger.debug(
            {
                beginExclusive: this.beginExclusive,
                endInclusive: this.endInclusive,
            },
            'TransactionHistoryService state'
        )

        return fetchedUpdates
    }

    // TODO: instead of fetching more recent history, can we rely on transaction
    // events?  Or can we insert them here as they are purged from the ACS?
    async fetchMoreRecent(): Promise<Transfer[]> {
        if (this.endInclusive === undefined) {
            // This means we never fetched any transactions.  We want to start
            // with fetching a batch of older ones.
            return this.fetchOlder()
        } else {
            // If we do have an endInclusive, fetch everything in between
            // that and the most recent offset (ledger end).
            const ledgerEnd = await this.ledgerClient.get(
                '/v2/state/ledger-end'
            )
            await this.fetchRange({
                beginExclusive: this.endInclusive,
                endInclusive: ledgerEnd.offset,
            })
            return this.list()
        }
    }

    // TODO: return bool to determine we are finished?
    async fetchOlder(): Promise<Transfer[]> {
        // Figure out the end of the range.
        let endInclusive = this.beginExclusive
        if (endInclusive === undefined) {
            const ledgerEnd = await this.ledgerClient.get(
                '/v2/state/ledger-end'
            )
            endInclusive = ledgerEnd.offset
        }

        // Figure out the start of the ledger; we can't cache this but we could
        // cache the fact that we reached the start of it (since it would only
        // move forwards).
        const ledgerStartExclusive = (
            await this.ledgerClient.get('/v2/state/latest-pruned-offsets')
        ).participantPrunedUpToInclusive

        // Fetch an increasingly larger offset delta.
        // The actual fetching is handled by fetchRange which will paginate
        // into smaller batches.
        let delta = 256
        let beginExclusive = Math.max(
            ledgerStartExclusive,
            endInclusive - delta
        )
        let numUpdates = await this.fetchRange({ beginExclusive, endInclusive })
        while (numUpdates === 0 && beginExclusive > ledgerStartExclusive) {
            delta *= 2
            beginExclusive = Math.max(
                ledgerStartExclusive,
                endInclusive - delta
            )
            numUpdates = await this.fetchRange({ beginExclusive, endInclusive })
        }

        return this.list()
    }

    list(): Transfer[] {
        const transfers = [...this.transfers.values()]
        transfers.sort(
            (a, b) => b.requestedAt.valueOf() - a.requestedAt.valueOf()
        )
        return transfers
    }
}
