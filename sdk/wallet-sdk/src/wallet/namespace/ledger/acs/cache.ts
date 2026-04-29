// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { ContractId } from '@canton-network/core-token-standard'
import { LedgerTypes, SDKContext } from '../../../sdk.js'
import { LedgerNamespace } from '../namespace.js'
import { ACSReader } from './reader.js'
import { ACEvent, ACS_UPDATE_CONFIG, ACSState } from './types.js'
import { Ops } from '@canton-network/core-provider-ledger'
import {
    AcsOptions,
    buildActiveContractFilter,
} from '@canton-network/core-acs-reader'

export class ACSCacheNamespace {
    private readonly state: ACSState = {
        initial: {
            offset: 0,
            acs: [],
        },
        updates: {
            offset: 0,
            acs: [],
        },
        archivedACs: new Set(),
    }
    private readonly acsReader: ACSReader
    private readonly ledger: LedgerNamespace

    constructor(private readonly sdkContext: SDKContext) {
        this.acsReader = new ACSReader(sdkContext)
        this.ledger = new LedgerNamespace(sdkContext)
    }

    /**
     * Returns the initial snapshot of the active contract set.
     * Contains the base state captured at a specific ledger offset.
     */
    private get initial() {
        return this.state.initial
    }

    /**
     * Returns the incremental updates applied after the initial snapshot.
     * Contains created and archived events that occurred since the initial state.
     */
    private get updates() {
        return this.state.updates
    }

    /**
     * Updates the cache to include ledger changes up to the specified offset.
     * Fetches and applies incremental updates from the ledger, initializing the cache if needed.
     * Automatically prunes old events when the update buffer exceeds configured thresholds.
     */
    public async update(options: AcsOptions) {
        if (!this.initial.acs.length || this.initial.offset > options.offset) {
            await this.initState(options)
        }

        const builtFilter = buildActiveContractFilter(options)

        const updates = await this.fetchUpdates({
            beginExclusive: this.updates.offset,
            endInclusive: options.offset,
            eventFormat: {
                verbose: Boolean(builtFilter.verbose),
                ...builtFilter.filter,
            },
        })

        // in practise length should never be > maxUpdatesToFetch only equal (server should never return more than limit in query). This is just a safeguard.
        if (updates.length >= ACS_UPDATE_CONFIG.maxUpdatesToFetch)
            void this.update(options)

        const { newEvents, newOffset } = this.extractEvents({
            offset: this.updates.offset,
            updates,
        })

        if (newOffset > this.updates.offset) {
            this.updates.offset = newOffset
            this.updates.acs = this.updates.acs.concat(newEvents)
        } else this.updates.offset = options.offset

        if (this.updates.acs.length >= ACS_UPDATE_CONFIG.maxEventsBeforePrune) {
            this.prune()
        }
    }

    /**
     * Calculates the active contract set at a specific ledger offset.
     * Applies cached updates to the initial snapshot and filters out archived contracts.
     * Throws an error if the cache is not initialized or the requested offset is too old.
     */
    public calculateAt(offset: number) {
        if (!this.initial.acs)
            this.sdkContext.error.throw({
                message: 'No ACS initialized. Call `.update()` first',
                type: 'Unexpected',
            })
        if (this.initial.offset > offset)
            this.sdkContext.error.throw({
                message: 'Provided offset cannot be smaller than ACS offset',
                type: 'Unexpected',
            })

        const newContracts: LedgerTypes['JsGetActiveContractsResponse'][] = []
        const newArchivedContracts: Set<ContractId<string>> = new Set()

        this.updates.acs
            .filter((ac) => ac.offset <= offset)
            .map((ac) => {
                if (isCreatedEvent(ac)) {
                    newContracts.push({
                        workflowId: ac.workflowId ?? '',
                        contractEntry: {
                            JsActiveContract: {
                                createdEvent: ac.event,
                                synchronizerId: ac.synchronizerId ?? '',
                                reassignmentCounter: 0,
                            },
                        },
                    })
                } else {
                    newArchivedContracts.add(
                        ac.event.contractId as ContractId<string>
                    )
                }
            })

        const allContracts = this.initial.acs.concat(newContracts)
        this.state.archivedACs =
            this.state.archivedACs.union(newArchivedContracts)

        return allContracts.filter(({ contractEntry }) => {
            if (!contractEntry) return false
            const id = (
                'JsActiveContract' in contractEntry
                    ? contractEntry.JsActiveContract.createdEvent.contractId
                    : ''
            ) as ContractId<string>

            return !this.state.archivedACs.has(id)
        })
    }

    /**
     * Initializes the cache state by fetching the active contract set at the specified offset.
     * Clears any existing updates and archived contract tracking.
     */
    private async initState(options: AcsOptions) {
        const initialAcs = await this.acsReader.readRaw(options)
        this.state.initial = {
            offset: options.offset,
            acs: initialAcs,
        }
        this.state.updates = {
            offset: options.offset,
            acs: [],
        }
        this.state.archivedACs = new Set()
    }

    /**
     * Compacts the cache by moving the initial snapshot forward to a more recent offset.
     * Applies accumulated updates to create a new initial state and discards old events.
     * Improves performance by reducing the number of updates to process on each query.
     */
    private prune() {
        const newOffset = Math.max(
            this.initial.offset,
            this.updates.offset - ACS_UPDATE_CONFIG.safeOffsetDeltaForPrune
        )

        if (newOffset > this.initial.offset) {
            const responses = this.calculateAt(newOffset)

            this.state.initial = {
                offset: newOffset,
                acs: responses,
            }
            this.state.updates = {
                offset: this.updates.offset,
                acs: this.updates.acs.filter((ac) => ac.offset > newOffset),
            }
        }
    }

    /**
     * Fetches ledger updates between two offsets.
     * Queries the ledger API for transactions containing contract create and archive events.
     */
    private async fetchUpdates(args: {
        beginExclusive: number
        endInclusive: number
        eventFormat: LedgerTypes['EventFormat']
    }) {
        const { beginExclusive, endInclusive, eventFormat } = args
        const updateFormat: Ops.PostV2UpdatesFlats['ledgerApi']['params']['body']['updateFormat'] =
            {
                includeTransactions: {
                    eventFormat,
                    transactionShape: 'TRANSACTION_SHAPE_ACS_DELTA',
                },
            }
        return await this.ledger.internal.updates({
            beginExclusive,
            endInclusive,
            updateFormat,
        })
    }

    /**
     * Extracts contract creation and archival events from raw ledger updates.
     * Processes transaction and checkpoint updates to build a list of relevant contract events.
     * Tracks the highest offset seen across all updates.
     */
    private extractEvents(args: {
        updates: Awaited<ReturnType<ACSCacheNamespace['fetchUpdates']>>
        offset: number
    }) {
        const { updates, offset } = args
        const newEvents: Array<ACEvent> = []
        let newOffset = offset
        updates.forEach((update) => {
            if (!update || !update.update) {
                return
            }
            if ('Transaction' in update.update) {
                const transaction = update.update.Transaction
                const trOffset = transaction?.value?.offset
                if (trOffset && trOffset > newOffset) {
                    const events: Array<LedgerTypes['Event']> =
                        transaction?.value?.events ?? []
                    events.forEach((event) => {
                        if (!event) {
                            return
                        }
                        if (
                            'CreatedEvent' in event ||
                            'ArchivedEvent' in event
                        ) {
                            const eventData =
                                'CreatedEvent' in event
                                    ? event.CreatedEvent
                                    : event.ArchivedEvent

                            const acUpdate: ACEvent = {
                                event: eventData,
                                offset: trOffset,
                                workflowId:
                                    transaction?.value?.workflowId ?? null,
                                synchronizerId:
                                    transaction?.value?.synchronizerId ?? null,
                                ...('ArchivedEvent' in event && {
                                    archived: true,
                                }),
                            }
                            newEvents.push(acUpdate)
                            newOffset = trOffset
                        }
                    })
                }
            } else if ('OffsetCheckpoint' in update.update) {
                const checkpoint = update.update.OffsetCheckpoint
                const offset = checkpoint?.value?.offset
                if (offset) {
                    newOffset = offset
                }
            } else {
                this.sdkContext.logger.warn(
                    {
                        value: JSON.stringify(update.update),
                    },
                    'ACS update got unknown update type'
                )
            }
        })
        return { newEvents, newOffset }
    }
}

/**
 * Checks if an event represents a contract creation.
 * Used to distinguish between created and archived events when processing cache updates.
 */
function isCreatedEvent(
    event: ACEvent
): event is ACEvent & { archived: true; event: LedgerTypes['CreatedEvent'] } {
    return !event.archived
}
