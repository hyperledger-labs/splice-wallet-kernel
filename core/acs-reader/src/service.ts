// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type {
    AbstractLedgerProvider,
    Ops,
} from '@canton-network/core-provider-ledger'
import type { LedgerCommonSchemas } from '@canton-network/core-ledger-client-types'

import { PaginatedACSCache } from './cache/item'

type Types = LedgerCommonSchemas

export type JSContractEntry = Types['JsContractEntry']
export type JsCantonError = Types['JsCantonError']

export type AcsOptions = {
    offset?: number
    templateIds?: string[]
    parties?: string[] //TODO: Figure out if this should use this.partyId by default and not allow cross party filtering
    filterByParty?: boolean
    interfaceIds?: string[]
    limit?: number
    continueUntilCompletion?: boolean
}
export type PaginatedAcsOptions = Omit<AcsOptions, 'limit'> &
    Pick<Types['GetActiveContractsPageRequest'], 'pageToken' | 'maxPageSize'>

type ResolvedOptions<Options> = Omit<Options, 'offset'> & { offset: number }

export type ResolvedAcsOptions = ResolvedOptions<AcsOptions>
export type PaginatedResolvedAcsOptions = ResolvedOptions<PaginatedAcsOptions>

type ActiveContractsRequest = Omit<
    Ops.PostV2StateActiveContracts['ledgerApi']['params']['body'],
    'eventFormat' | 'filter' | 'verbose'
> & {
    eventFormat: Types['EventFormat']
}

export class AcsService {
    constructor(private readonly ledgerProvider: AbstractLedgerProvider) {}

    public async getPaginatedActiveContracts(
        options: Omit<
            PaginatedResolvedAcsOptions,
            'continueUntilCompletion'
        > & {
            continueUntilCompletion: true
        }
    ): Promise<Types['JsGetActiveContractsPageResponse'][]>
    public async getPaginatedActiveContracts(
        options: Omit<
            PaginatedResolvedAcsOptions,
            'continueUntilCompletion'
        > & {
            continueUntilCompletion: false
        }
    ): Promise<Types['JsGetActiveContractsPageResponse']>
    public async getPaginatedActiveContracts(
        options: Omit<PaginatedResolvedAcsOptions, 'continueUntilCompletion'>
    ): Promise<Types['JsGetActiveContractsPageResponse']>
    public async getPaginatedActiveContracts(
        options: PaginatedResolvedAcsOptions
    ): Promise<
        | Types['JsGetActiveContractsPageResponse']
        | Types['JsGetActiveContractsPageResponse'][]
    > {
        const { continueUntilCompletion, ...baseArgs } = options
        const { maxPageSize, pageToken } = baseArgs

        const { activeAtOffset, eventFormat } =
            buildActiveContractFilter(options)

        if (continueUntilCompletion) {
            const results: Types['JsGetActiveContractsPageResponse'][] = []
            let shouldContinue = true
            while (shouldContinue) {
                const pageToken = results.length
                    ? results[results.length - 1].nextPageToken
                    : PaginatedACSCache.FIRST_PAGE_TOKEN
                const result = await this.getPaginatedActiveContracts({
                    ...baseArgs,
                    continueUntilCompletion: false,
                    ...(pageToken ? { pageToken } : {}),
                })

                results.push(result)
                shouldContinue = Boolean(result.nextPageToken)
            }
            return results
        }

        const body: Ops.PostV2StateActiveContractsPage['ledgerApi']['params']['body'] =
            {
                eventFormat,
                activeAtOffset,
            }
        if (maxPageSize !== undefined) {
            body.maxPageSize = maxPageSize
        }
        if (pageToken !== undefined) {
            body.pageToken = pageToken
        }

        return await this.ledgerProvider.request<Ops.PostV2StateActiveContractsPage>(
            {
                method: 'ledgerApi',
                params: {
                    requestMethod: 'post',
                    resource: '/v2/state/active-contracts-page',
                    body,
                },
            }
        )
    }

    public async getActiveContracts(
        options: ResolvedAcsOptions
    ): Promise<Array<Types['JsGetActiveContractsResponse']>> {
        const { limit, continueUntilCompletion } = options

        const filter = buildActiveContractFilter(options)

        if (continueUntilCompletion) {
            // Query-mode: if limit it set, perform a series of http queries (scan whole ledger)
            return await this.fetchActiveContractsUntilComplete(
                filter,
                limit ?? 200
            )
        }

        return await this.ledgerProvider.request<Ops.PostV2StateActiveContracts>(
            {
                method: 'ledgerApi',
                params: {
                    resource: '/v2/state/active-contracts',
                    requestMethod: 'post',
                    body: filter,
                    query: limit ? { limit: limit } : {},
                },
            }
        )
    }

    private async fetchActiveContractsUntilComplete(
        args: ActiveContractsRequest,
        limit: number
    ): Promise<Array<Types['JsGetActiveContractsResponse']>> {
        const ledgerEnd =
            await this.ledgerProvider.request<Ops.GetV2StateLedgerEnd>({
                method: 'ledgerApi',
                params: {
                    resource: '/v2/state/ledger-end',
                    requestMethod: 'get',
                    query: {},
                },
            })

        const bodyRequest: Partial<
            Ops.PostV2Updates['ledgerApi']['params']['body']
        > = {
            beginExclusive: 0,
            updateFormat: {
                includeTransactions: {
                    eventFormat: args.eventFormat,
                    transactionShape: 'TRANSACTION_SHAPE_ACS_DELTA',
                },
            },
        }
        if (ledgerEnd.offset !== undefined) {
            bodyRequest.endInclusive = ledgerEnd.offset
        }

        const finalLedgerEnd = ledgerEnd.offset ?? 0
        let currentOffset = 0

        const allContractsData = new Map()
        const exercisedContracts = new Set()

        while (currentOffset < finalLedgerEnd) {
            bodyRequest.beginExclusive = currentOffset
            const results = (
                await this.ledgerProvider.request<Ops.PostV2Updates>({
                    method: 'ledgerApi',
                    params: {
                        resource: '/v2/updates',
                        requestMethod: 'post',
                        body: bodyRequest as Ops.PostV2Updates['ledgerApi']['params']['body'],
                        query: { limit: limit },
                    },
                })
            )
                .filter(({ update }) => !!update && 'Transaction' in update)
                .map(({ update }) => {
                    if (update && 'Transaction' in update) {
                        return update.Transaction.value
                    }
                    throw new Error('Expected Transaction update')
                })
                .map((data) => {
                    const archivedEvents = data.events
                        ?.filter((event) => !!event && 'ArchivedEvent' in event)
                        .map(
                            (event) =>
                                (
                                    event as {
                                        ArchivedEvent: Types['ArchivedEvent']
                                    }
                                ).ArchivedEvent
                        )
                        .filter((event) => !!event)
                    const exercisedEvents = data.events
                        ?.filter(
                            (event) => !!event && 'ExercisedEvent' in event
                        )
                        .map(
                            (event) =>
                                (
                                    event as {
                                        ExercisedEvent: Types['ExercisedEvent']
                                    }
                                ).ExercisedEvent
                        )
                        .filter((event) => !!event)
                        .filter((event) => !!event.consuming)
                    const createdEvents = data.events
                        ?.filter((event) => !!event && 'CreatedEvent' in event)
                        .map(
                            (event) =>
                                (
                                    event as {
                                        CreatedEvent: Types['CreatedEvent']
                                    }
                                ).CreatedEvent
                        )
                        .filter((event) => !!event)
                        // TODO: remove the filter once /v2/updates is fixed
                        .filter((event) =>
                            Object.keys(
                                args.eventFormat.filtersByParty ?? {}
                            ).includes(
                                (event.createArgument as { owner?: string })
                                    ?.owner ?? ''
                            )
                        )

                    archivedEvents?.forEach((event) => {
                        if (event.contractId)
                            exercisedContracts.add(event.contractId)
                    })

                    exercisedEvents?.forEach((event) => {
                        if (event.contractId)
                            exercisedContracts.add(event.contractId)
                    })

                    createdEvents?.forEach((event) => {
                        if (!event.contractId) return
                        allContractsData.set(event.contractId, {
                            workflowId: data.workflowId,
                            contractEntry: {
                                JsActiveContract: {
                                    synchronizerId: data.synchronizerId,
                                    createdEvent: event,
                                    reassignmentCounter: data.offset,
                                },
                            },
                        })
                    })

                    currentOffset = Math.max(currentOffset, data.offset)
                    return true
                })

            if (!results.length) currentOffset++
        }

        // filter through all contracts to retrieve only active ones
        exercisedContracts.forEach((cid) => {
            allContractsData.delete(cid)
        })

        return Array.from(allContractsData.values())
    }
}

export function buildActiveContractFilter(options: {
    offset: number
    templateIds?: string[]
    parties?: string[] //TODO: Figure out if this should use this.partyId by default and not allow cross party filtering
    filterByParty?: boolean
    interfaceIds?: string[]
    limit?: number
}) {
    const request: ActiveContractsRequest = {
        eventFormat: {
            filtersByParty: {},
            verbose: false,
        },
        activeAtOffset: options?.offset,
    }

    // Helper to build TemplateFilter array
    const buildTemplateFilter = (templateIds?: string[]) => {
        if (!templateIds) return []

        return templateIds.map((templateId) => ({
            identifierFilter: {
                TemplateFilter: {
                    value: {
                        templateId,
                        includeCreatedEventBlob: true, //TODO: figure out if this should be configurable
                    },
                },
            },
        }))
    }

    const buildInterfaceFilter = (interfaceIds?: string[]) => {
        if (!interfaceIds) return []

        return interfaceIds.map((interfaceId) => ({
            identifierFilter: {
                InterfaceFilter: {
                    value: {
                        interfaceId,
                        includeCreatedEventBlob: true, //TODO: figure out if this should be configurable
                        includeInterfaceView: true,
                    },
                },
            },
        }))
    }

    if (
        options?.filterByParty &&
        options.parties &&
        options.parties.length > 0
    ) {
        // Filter by party: set filtersByParty for each party
        const cumulativeFilter =
            options?.templateIds && !options?.interfaceIds
                ? buildTemplateFilter(options.templateIds)
                : options?.interfaceIds && !options?.templateIds
                  ? buildInterfaceFilter(options.interfaceIds)
                  : []

        for (const party of options.parties) {
            const filtersByParty = request.eventFormat?.filtersByParty
            if (!filtersByParty) {
                throw new Error(
                    'filtersByParty is missing from active contract filter'
                )
            }
            filtersByParty[party] = {
                cumulative: cumulativeFilter,
            }
        }
    } else if (options?.templateIds) {
        // Only template filter, no party
        request.eventFormat!.filtersForAnyParty = {
            cumulative: buildTemplateFilter(options.templateIds),
        }
    } else if (options?.interfaceIds) {
        request.eventFormat!.filtersForAnyParty = {
            cumulative: buildInterfaceFilter(options.interfaceIds),
        }
    }

    return request
}
