// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ACEvent, ACSState } from '../../types'
import { ACS_UPDATE_CONFIG } from '../../types'
import type { Ops } from '@canton-network/core-provider-ledger'
import type { LedgerCommonSchemas } from '@canton-network/core-ledger-client-types'
import {
    type ResolvedAcsOptions,
    buildActiveContractFilter,
} from '../../service'
import type { ContractId } from '@canton-network/core-types'
import { BaseACSCache, isCreatedEvent, logger } from './base'

export class ACSCache extends BaseACSCache {
    protected readonly state: ACSState = {
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

    public async update(options: ResolvedAcsOptions) {
        if (!this.initial.acs.length || this.initial.offset > options.offset) {
            await this.initState(options)
        }

        const builtFilter = buildActiveContractFilter(options)

        const updates = await this.fetchUpdates({
            beginExclusive: this.updates.offset,
            endInclusive: options.offset,
            eventFormat: builtFilter.eventFormat,
        })

        /**
         * in practice length should never be > maxUpdatesToFetch only equal (server should never return more than limit in query). This is just a safeguard.
         */
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

    public calculateAt(offset: number) {
        if (!this.initial.acs)
            throw Error('No ACS initialized. Call `.update()` first')
        if (this.initial.offset > offset)
            throw Error('Provided offset cannot be smaller than ACS offset')

        const newContracts: LedgerCommonSchemas['JsGetActiveContractsResponse'][] =
            []
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
    private async initState(options: ResolvedAcsOptions) {
        const initialAcs = await this.service.getActiveContracts(options)
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
        eventFormat: LedgerCommonSchemas['EventFormat']
    }) {
        const { beginExclusive, endInclusive, eventFormat } = args
        const updateFormat: Ops.PostV2Updates['ledgerApi']['params']['body']['updateFormat'] =
            {
                includeTransactions: {
                    eventFormat,
                    transactionShape: 'TRANSACTION_SHAPE_ACS_DELTA',
                },
            }

        return await this.ledger.request<Ops.PostV2Updates>({
            method: 'ledgerApi',
            params: {
                resource: '/v2/updates',
                requestMethod: 'post',
                body: {
                    beginExclusive,
                    endInclusive,
                    updateFormat,
                },
                query: {
                    limit: ACS_UPDATE_CONFIG.maxUpdatesToFetch,
                    stream_idle_timeout_ms: 1000,
                },
            },
        })
    }

    /**
     * Extracts contract creation and archival events from raw ledger updates.
     * Processes transaction and checkpoint updates to build a list of relevant contract events.
     * Tracks the highest offset seen across all updates.
     */
    private extractEvents(args: {
        updates: Awaited<ReturnType<ACSCache['fetchUpdates']>>
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
                    const events: Array<LedgerCommonSchemas['Event']> =
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
                logger.debug('ACS update got unknown update type', {
                    update: update.update,
                })
            }
        })
        return { newEvents, newOffset }
    }
}
