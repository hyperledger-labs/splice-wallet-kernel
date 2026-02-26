// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as v3_3 from './generated-clients/openapi-3.3.0-SNAPSHOT.js'

import * as v3_4 from './generated-clients/openapi-3.4.12.js'
import { PartyId } from '@canton-network/core-types'

type TransactionFilter = Types['TransactionFilter']
type EventFormat = Types['EventFormat']
type Types = v3_3.components['schemas'] | v3_4.components['schemas']
type BaseFilterOptions = {
    includeWildcard?: boolean
    isMasterUser?: boolean
    partyId?: PartyId | undefined
}

type FilterIdentifiers =
    | {
          templateIds: string[] | string
          interfaceIds?: never
      }
    | {
          interfaceIds: string[] | string
          templateIds?: never
      }

type TransactionFilterOptions = BaseFilterOptions & FilterIdentifiers

type EventFilterOptions = TransactionFilterOptions & { verbose?: boolean }

export function TransactionFilterBySetup(
    options: TransactionFilterOptions
): TransactionFilter {
    const { templateIds, interfaceIds, ...baseOptions } = options
    return buildFilter<TransactionFilter>(
        normalizeToArray(templateIds || []),
        normalizeToArray(interfaceIds || []),
        baseOptions
    )
}

export function EventFilterBySetup(options: EventFilterOptions): EventFormat {
    const {
        templateIds,
        interfaceIds,
        verbose = false,
        ...baseOptions
    } = options
    return buildFilter<EventFormat>(
        normalizeToArray(templateIds || []),
        normalizeToArray(interfaceIds || []),
        baseOptions,
        { verbose }
    )
}

function normalizeToArray<T>(value: T | T[]): T[] {
    return Array.isArray(value) ? value : [value]
}

function createWildcardFilter() {
    return {
        identifierFilter: {
            WildcardFilter: {
                value: {
                    includeCreatedEventBlob: true,
                },
            },
        },
    }
}

function createIdentiferFilter(type: 'Template' | 'Interface', id: string) {
    if (type === 'Template') {
        return {
            identifierFilter: {
                TemplateFilter: {
                    value: {
                        templateId: id,
                        includeCreatedEventBlob: true,
                    },
                },
            },
        }
    } else {
        return {
            identifierFilter: {
                InterfaceFilter: {
                    value: {
                        interfaceId: id,
                        includeInterfaceView: true,
                        includeCreatedEventBlob: true,
                    },
                },
            },
        }
    }
}

function buildCumulativeFilters(
    templateIds: string[],
    interfaceIds: string[],
    includeWildcard: boolean
) {
    if (templateIds.length > 0) {
        return [
            ...templateIds.map((templateId) =>
                createIdentiferFilter('Template', templateId)
            ),
            ...(includeWildcard ? [createWildcardFilter()] : []),
        ]
    } else {
        return [
            ...interfaceIds.map((interfaceId) =>
                createIdentiferFilter('Interface', interfaceId)
            ),
            ...(includeWildcard ? [createWildcardFilter()] : []),
        ]
    }
}

function filtersByParty(
    party: PartyId,
    templateIds: string[],
    interfaceIds: string[],
    includeWildcard: boolean
): TransactionFilter['filtersByParty'] {
    return {
        [party]: {
            cumulative: buildCumulativeFilters(
                templateIds,
                interfaceIds,
                includeWildcard
            ),
        },
    }
}

function filtersForAnyParty(
    interfaceNames: string[],
    templateIds: string[],
    includeWildcard: boolean
): TransactionFilter['filtersForAnyParty'] {
    return {
        cumulative: buildCumulativeFilters(
            templateIds,
            interfaceNames,
            includeWildcard
        ),
    }
}

function buildFilter<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends { filtersByParty?: any; filtersForAnyParty?: any },
>(
    templateIds: string[],
    interfaceIds: string[],
    options: BaseFilterOptions,
    additionalProps?: Partial<T>
): T {
    const { isMasterUser = false, partyId, includeWildcard = false } = options

    if (isMasterUser) {
        return {
            filtersByParty: {},
            filtersForAnyParty: filtersForAnyParty(
                templateIds,
                interfaceIds,
                includeWildcard
            ),
            ...additionalProps,
        } as T
    }

    if (!partyId) {
        throw new Error('Party must be provided for non-master users')
    }

    return {
        filtersByParty: filtersByParty(
            partyId,
            templateIds,
            interfaceIds,
            includeWildcard
        ),
        ...additionalProps,
    } as T
}

export async function buildActiveContractFilter(options: {
    offset: number
    templateIds?: string[]
    parties?: string[]
    filterByParty?: boolean
    interfaceIds?: string[]
    limit?: number
}) {
    const filter: Types['GetActiveContractsRequest'] = {
        filter: {
            filtersByParty: {},
        },
        verbose: false,
        activeAtOffset: options?.offset,
    }

    // Helper to build TemplateFilter array
    const buildTemplateFilter = (templateIds?: string[]) => {
        if (!templateIds) return []
        return [
            {
                identifierFilter: {
                    TemplateFilter: {
                        value: {
                            templateId: templateIds[0],
                            includeCreatedEventBlob: true, //TODO: figure out if this should be configurable
                        },
                    },
                },
            },
        ]
    }

    const buildInterfaceFilter = (interfaceIds?: string[]) => {
        if (!interfaceIds) return []
        return [
            {
                identifierFilter: {
                    InterfaceFilter: {
                        value: {
                            interfaceId: interfaceIds[0],
                            includeCreatedEventBlob: true, //TODO: figure out if this should be configurable
                            includeInterfaceView: true,
                        },
                    },
                },
            },
        ]
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
            filter.filter!.filtersByParty[party] = {
                cumulative: cumulativeFilter,
            }
        }
    } else if (options?.templateIds) {
        // Only template filter, no party
        filter.filter!.filtersForAnyParty = {
            cumulative: buildTemplateFilter(options.templateIds),
        }
    } else if (options?.interfaceIds) {
        filter.filter!.filtersForAnyParty = {
            cumulative: buildInterfaceFilter(options.templateIds),
        }
    }

    return filter
}
