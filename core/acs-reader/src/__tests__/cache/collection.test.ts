// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
    ACSCacheCollection,
    PaginatedACSCacheCollection,
} from '../../cache/collection'
import type { LedgerCommonSchemas } from '@canton-network/core-ledger-client-types'

const { mockCache, MockACSCache } = vi.hoisted(() => {
    const update = vi.fn()
    const calculateAt = vi.fn()
    const getPage = vi.fn()

    const mockCache = {
        update,
        calculateAt,
        getPage,
    }

    const MockACSCache = vi.fn(
        class {
            update = update
            calculateAt = calculateAt
            getPage = getPage
        }
    )

    return { mockCache, MockACSCache }
})

vi.mock('../../cache/item', () => {
    return {
        ACSCache: MockACSCache,
        PaginatedACSCache: MockACSCache,
    }
})

const ledgerProvider = vi.hoisted(() => ({
    request: vi.fn(),
}))

describe('cache collection', () => {
    beforeEach(() => {})
    ;[ACSCacheCollection, PaginatedACSCacheCollection].forEach(
        (cacheConstructor) => {
            describe(`using ${cacheConstructor.name}`, () => {
                let collection: ACSCacheCollection | PaginatedACSCacheCollection

                beforeEach(() => {
                    mockCache.calculateAt.mockReturnValue([
                        {
                            workflowId: 'test-workflow',
                            contractEntry: {
                                JsActiveContract: {
                                    createdEvent: {
                                        contractId: 'contract-1',
                                        templateId: 'template1',
                                    },
                                    synchronizerId: 'sync1',
                                    reassignmentCounter: 0,
                                },
                            },
                        },
                    ])

                    collection = new cacheConstructor(ledgerProvider)
                })

                it('should create cache collection with custom options', () => {
                    expect(collection).toBeDefined()

                    const customCollection = new cacheConstructor(
                        ledgerProvider,
                        {
                            maxSize: 50,
                            entryExpirationTimeInMS: 5 * 60 * 1000,
                        }
                    )
                    expect(customCollection).toBeDefined()
                })

                describe('readFromCache', () => {
                    it('should read from cache with single party and template', async () => {
                        const options = {
                            offset: 100,
                            parties: ['party1'],
                            templateIds: ['template1'],
                        }

                        const result = await collection.readFromCache(options)

                        expect(MockACSCache).toHaveBeenCalledWith(
                            ledgerProvider
                        )
                        expect(mockCache.update).toHaveBeenCalledWith(options)
                        expect(mockCache.calculateAt).toHaveBeenCalledWith(100)
                        expect(result).toHaveLength(1)
                    })

                    it('should read from cache with multiple parties and templates', async () => {
                        const options = {
                            offset: 100,
                            parties: ['party1', 'party2'],
                            templateIds: [
                                'template1',
                                'template2',
                                'template3',
                            ],
                        }

                        const result = await collection.readFromCache(options)

                        // Should create 6 cache instances (2 parties × 3 templates)
                        expect(MockACSCache).toHaveBeenCalledTimes(6)
                        expect(mockCache.update).toHaveBeenCalledTimes(6)
                        expect(mockCache.calculateAt).toHaveBeenCalledTimes(6)
                        for (let i = 0; i < 6; ++i) {
                            expect(mockCache.update).toHaveBeenNthCalledWith(
                                i + 1,
                                options
                            )
                            expect(
                                mockCache.calculateAt
                            ).toHaveBeenNthCalledWith(i + 1, options.offset)
                        }
                        expect(result).toHaveLength(6)
                    })

                    it('should read from cache with parties and interfaces', async () => {
                        const options = {
                            offset: 100,
                            parties: ['party1'],
                            interfaceIds: ['interface1', 'interface2'],
                        }

                        const result = await collection.readFromCache(options)

                        // Should create 2 cache instances (1 party × 2 interfaces)
                        expect(MockACSCache).toHaveBeenCalledTimes(2)
                        expect(mockCache.update).toHaveBeenCalledTimes(2)
                        expect(result).toHaveLength(2)
                    })

                    it('should read from cache with parties, templates, and interfaces', async () => {
                        const options = {
                            offset: 150,
                            parties: ['party1'],
                            templateIds: ['template1'],
                            interfaceIds: ['interface1'],
                        }

                        const result = await collection.readFromCache(options)

                        // Should create 2 cache instances (1 for interface, 1 for template)
                        expect(MockACSCache).toHaveBeenCalledTimes(2)
                        expect(mockCache.update).toHaveBeenCalledTimes(2)
                        expect(mockCache.calculateAt).toHaveBeenCalledWith(150)
                        expect(result).toHaveLength(2)
                    })

                    it('should reuse existing cache for same key', async () => {
                        const options = {
                            offset: 100,
                            parties: ['party1'],
                            templateIds: ['template1'],
                        }

                        await collection.readFromCache(options)
                        await collection.readFromCache(options)

                        // Should only create cache once
                        expect(MockACSCache).toHaveBeenCalledOnce()
                        // But should update and calculate twice
                        expect(mockCache.update).toHaveBeenCalledTimes(2)
                        expect(mockCache.calculateAt).toHaveBeenCalledTimes(2)
                    })

                    it('should create different caches for different keys', async () => {
                        await collection.readFromCache({
                            offset: 100,
                            parties: ['party1'],
                            templateIds: ['template1'],
                        })

                        await collection.readFromCache({
                            offset: 100,
                            parties: ['party2'],
                            templateIds: ['template1'],
                        })

                        // Should create two different caches
                        expect(MockACSCache).toHaveBeenCalledTimes(2)
                    })

                    it('should flatten results from multiple queries', async () => {
                        mockCache.calculateAt.mockReturnValue([
                            {
                                contractEntry: {
                                    JsActiveContract: {
                                        createdEvent: { contractId: 'c1' },
                                    },
                                },
                            },
                            {
                                contractEntry: {
                                    JsActiveContract: {
                                        createdEvent: { contractId: 'c2' },
                                    },
                                },
                            },
                        ])

                        const options = {
                            offset: 100,
                            parties: ['party1'],
                            templateIds: ['template1', 'template2'],
                        }

                        const result = await collection.readFromCache(options)

                        // 2 templates × 2 contracts per template = 4 total contracts
                        expect(result).toHaveLength(4)
                    })
                })
            })
        }
    )

    it('should read page from paginated cache', async () => {
        const collection = new PaginatedACSCacheCollection(ledgerProvider)

        const expectedResult: LedgerCommonSchemas['JsGetActiveContractsPageResponse'] =
            {
                activeAtOffset: 150,
                activeContracts: [{}, {}],
                nextPageToken: 'nextPageToken',
            }

        ledgerProvider.request.mockResolvedValueOnce({
            offset: 100,
        } satisfies LedgerCommonSchemas['GetLedgerEndResponse'])

        mockCache.getPage.mockResolvedValueOnce(expectedResult)

        const result = await collection.readPageFromCache({
            party: 'partyId',
            templateId: 'templateId',
            interfaceId: 'interfaceId',
            pageToken: 'somePageToken',
        })

        expect(ledgerProvider.request).toHaveBeenCalledExactlyOnceWith({
            method: 'ledgerApi',
            params: {
                requestMethod: 'get',
                resource: '/v2/state/ledger-end',
                query: {},
            },
        })
        expect(mockCache.update).toHaveBeenCalledExactlyOnceWith({
            pageToken: 'somePageToken',
            offset: 100,
            parties: ['partyId'],
            templateIds: ['templateId'],
            interfaceIds: ['interfaceId'],
        })
        expect(result).toEqual(expectedResult)
    })
})
