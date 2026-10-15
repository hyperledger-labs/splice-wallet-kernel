// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PaginatedACSCache } from '../../../cache/item'

const {
    getPaginatedActiveContracts,
    MockACSService,
    mockBuildActiveContractFilter,
} = vi.hoisted(() => {
    const getPaginatedActiveContracts = vi.fn()
    const mockBuildActiveContractFilter = vi.fn((options) => ({
        eventFormat: { filtersByParty: {}, verbose: false },
        activeAtOffset: options.offset,
    }))

    const MockACSService = vi.fn(
        class {
            getPaginatedActiveContracts = getPaginatedActiveContracts
        }
    )

    return {
        getPaginatedActiveContracts,
        MockACSService,
        mockBuildActiveContractFilter,
    }
})

vi.mock('../../../service.ts', () => {
    return {
        AcsService: MockACSService,
        buildActiveContractFilter: mockBuildActiveContractFilter,
    }
})

const ledgerProvider = vi.hoisted(() => ({
    request: vi.fn(),
}))

describe('cache - paginated item', () => {
    let cache: PaginatedACSCache

    beforeEach(() => {
        getPaginatedActiveContracts.mockResolvedValue({
            activeContracts: [
                {
                    workflowId: 'id1',
                    contractEntry: {
                        JsActiveContract: {
                            createdEvent: {
                                contractId: 'initial-contract-1',
                                templateId: 'template1',
                                offset: 99,
                            },
                            synchronizerId: 'sync1',
                            reassignmentCounter: 0,
                        },
                    },
                },
                {
                    workflowId: 'id2',
                    contractEntry: {
                        JsActiveContract: {
                            createdEvent: {
                                contractId: 'initial-contract-2',
                                templateId: 'template2',
                                offset: 100,
                            },
                            synchronizerId: 'sync2',
                            reassignmentCounter: 0,
                        },
                    },
                },
            ],
            activeAtOffset: 100,
            nextPageToken: '',
        })

        cache = new PaginatedACSCache(ledgerProvider)
    })

    it('should call ACSService upon init', () => {
        expect(MockACSService).toHaveBeenCalledOnce()
    })

    describe('update', () => {
        it('should init state when cache is empty', async () => {
            const updateOptions = {
                offset: 100,
            }
            await cache.update(updateOptions)
            expect(getPaginatedActiveContracts).toHaveBeenCalledExactlyOnceWith(
                updateOptions
            )
        })

        it('should loop through pages until offset is reached', async () => {
            getPaginatedActiveContracts
                .mockResolvedValueOnce({
                    activeContracts: [
                        {
                            workflowId: 'id1',
                            contractEntry: {
                                JsActiveContract: {
                                    createdEvent: {
                                        contractId: 'contract-page1',
                                        templateId: 'template1',
                                        offset: 100,
                                    },
                                    synchronizerId: 'sync1',
                                    reassignmentCounter: 0,
                                },
                            },
                        },
                    ],
                    activeAtOffset: 100,
                    nextPageToken: 'page2',
                })
                .mockResolvedValueOnce({
                    activeContracts: [
                        {
                            workflowId: 'id2',
                            contractEntry: {
                                JsActiveContract: {
                                    createdEvent: {
                                        contractId: 'contract-page2',
                                        templateId: 'template2',
                                        offset: 200,
                                    },
                                    synchronizerId: 'sync1',
                                    reassignmentCounter: 0,
                                },
                            },
                        },
                    ],
                    activeAtOffset: 200,
                    nextPageToken: 'page3',
                })
                .mockResolvedValueOnce({
                    activeContracts: [
                        {
                            workflowId: 'id3',
                            contractEntry: {
                                JsActiveContract: {
                                    createdEvent: {
                                        contractId: 'contract-page3',
                                        templateId: 'template3',
                                        offset: 300,
                                    },
                                    synchronizerId: 'sync1',
                                    reassignmentCounter: 0,
                                },
                            },
                        },
                    ],
                    activeAtOffset: 300,
                    nextPageToken: '',
                })

            await cache.update({ offset: 300 })

            // Should have called getPaginatedActiveContracts 3 times (initial + 2 more pages)
            expect(getPaginatedActiveContracts).toHaveBeenCalledTimes(3)
            expect(getPaginatedActiveContracts).toHaveBeenNthCalledWith(1, {
                offset: 300,
            })
            expect(getPaginatedActiveContracts).toHaveBeenNthCalledWith(2, {
                offset: 300,
                pageToken: 'page2',
            })
            expect(getPaginatedActiveContracts).toHaveBeenNthCalledWith(3, {
                offset: 300,
                pageToken: 'page3',
            })
        })

        it('should stop pagination when nextPageToken is empty', async () => {
            await cache.update({ offset: 100 })

            // Try to update with higher offset, but no more pages available
            await cache.update({ offset: 200 })

            // Should only have called once (initial), not loop since nextPageToken is empty
            expect(getPaginatedActiveContracts).toHaveBeenCalledOnce()
        })

        it('should stop pagination when offset is reached', async () => {
            getPaginatedActiveContracts
                .mockResolvedValueOnce({
                    activeContracts: [],
                    activeAtOffset: 100,
                    nextPageToken: 'page2',
                })
                .mockResolvedValueOnce({
                    activeContracts: [],
                    activeAtOffset: 200,
                    nextPageToken: 'page3',
                })

            await cache.update({ offset: 150 })

            // Should have called twice: initial fetch reaches offset 100,
            // then fetches page2 which reaches offset 200 (> 150), so stops
            expect(getPaginatedActiveContracts).toHaveBeenCalledTimes(2)
        })
    })

    describe('calculateAt', () => {
        it('should throw error when no ACS is initialized', () => {
            const emptyCache = new PaginatedACSCache(ledgerProvider)
            expect(() => emptyCache.calculateAt(100)).toThrow()
        })

        it('should return contracts at specified offset', async () => {
            await cache.update({ offset: 100 })

            const result = cache.calculateAt(100)

            expect(result).toHaveLength(2)
            expect(result[0].contractEntry).toBeDefined()
            expect(result[1].contractEntry).toBeDefined()
        })

        it("shouldn't return contracts for wrong offset", async () => {
            await cache.update({ offset: 100 })

            const emptyResult = cache.calculateAt(0)
            expect(emptyResult).toHaveLength(0)
        })

        it('should filter contracts by offset from createdEvent', async () => {
            getPaginatedActiveContracts.mockResolvedValueOnce({
                activeContracts: [
                    {
                        workflowId: 'id1',
                        contractEntry: {
                            JsActiveContract: {
                                createdEvent: {
                                    contractId: 'contract-100',
                                    templateId: 'template1',
                                    offset: 100,
                                },
                                synchronizerId: 'sync1',
                                reassignmentCounter: 0,
                            },
                        },
                    },
                    {
                        workflowId: 'id2',
                        contractEntry: {
                            JsActiveContract: {
                                createdEvent: {
                                    contractId: 'contract-150',
                                    templateId: 'template2',
                                    offset: 150,
                                },
                                synchronizerId: 'sync1',
                                reassignmentCounter: 0,
                            },
                        },
                    },
                    {
                        workflowId: 'id3',
                        contractEntry: {
                            JsActiveContract: {
                                createdEvent: {
                                    contractId: 'contract-200',
                                    templateId: 'template3',
                                    offset: 200,
                                },
                                synchronizerId: 'sync1',
                                reassignmentCounter: 0,
                            },
                        },
                    },
                ],
                activeAtOffset: 200,
                nextPageToken: '',
            })

            await cache.update({ offset: 200 })

            const resultAt100 = cache.calculateAt(100)
            expect(resultAt100).toHaveLength(1) // Only contract-100

            const resultAt150 = cache.calculateAt(150)
            expect(resultAt150).toHaveLength(2) // contract-100 and contract-150

            const resultAt200 = cache.calculateAt(200)
            expect(resultAt200).toHaveLength(3) // All three contracts
        })

        it('should aggregate contracts from multiple pages', async () => {
            getPaginatedActiveContracts
                .mockResolvedValueOnce({
                    activeContracts: [
                        {
                            workflowId: 'id1',
                            contractEntry: {
                                JsActiveContract: {
                                    createdEvent: {
                                        contractId: 'page1-contract',
                                        templateId: 'template1',
                                        offset: 100,
                                    },
                                    synchronizerId: 'sync1',
                                    reassignmentCounter: 0,
                                },
                            },
                        },
                    ],
                    activeAtOffset: 100,
                    nextPageToken: 'page2',
                })
                .mockResolvedValueOnce({
                    activeContracts: [
                        {
                            workflowId: 'id2',
                            contractEntry: {
                                JsActiveContract: {
                                    createdEvent: {
                                        contractId: 'page2-contract',
                                        templateId: 'template2',
                                        offset: 200,
                                    },
                                    synchronizerId: 'sync1',
                                    reassignmentCounter: 0,
                                },
                            },
                        },
                    ],
                    activeAtOffset: 200,
                    nextPageToken: '',
                })

            await cache.update({ offset: 200 })

            const result = cache.calculateAt(200)

            // Should have contracts from both pages
            expect(result).toHaveLength(2)
            expect(
                result.some(
                    (c) =>
                        c.contractEntry &&
                        'JsActiveContract' in c.contractEntry &&
                        c.contractEntry.JsActiveContract.createdEvent
                            .contractId === 'page1-contract'
                )
            ).toBe(true)
            expect(
                result.some(
                    (c) =>
                        c.contractEntry &&
                        'JsActiveContract' in c.contractEntry &&
                        c.contractEntry.JsActiveContract.createdEvent
                            .contractId === 'page2-contract'
                )
            ).toBe(true)
        })

        it('should handle contracts without JsActiveContract gracefully', async () => {
            getPaginatedActiveContracts.mockResolvedValueOnce({
                activeContracts: [
                    {
                        workflowId: 'id1',
                        contractEntry: {
                            JsActiveContract: {
                                createdEvent: {
                                    contractId: 'valid-contract',
                                    templateId: 'template1',
                                    offset: 100,
                                },
                                synchronizerId: 'sync1',
                                reassignmentCounter: 0,
                            },
                        },
                    },
                    {
                        workflowId: 'id2',
                        contractEntry: undefined,
                    },
                ],
                activeAtOffset: 100,
                nextPageToken: '',
            })

            await cache.update({ offset: 100 })

            const result = cache.calculateAt(100)

            // Should filter out entries without JsActiveContract
            expect(result).toHaveLength(1)
            expect(
                result[0].contractEntry &&
                    'JsActiveContract' in result[0].contractEntry &&
                    result[0].contractEntry.JsActiveContract.createdEvent
                        .contractId
            ).toBe('valid-contract')
        })
    })

    describe('getPage', () => {
        it('should retrieve a specific page by token', async () => {
            getPaginatedActiveContracts.mockResolvedValueOnce({
                activeContracts: [
                    {
                        workflowId: 'id1',
                        contractEntry: {
                            JsActiveContract: {
                                createdEvent: {
                                    contractId: 'contract-1',
                                    templateId: 'template1',
                                    offset: 100,
                                },
                                synchronizerId: 'sync1',
                                reassignmentCounter: 0,
                            },
                        },
                    },
                ],
                activeAtOffset: 100,
                nextPageToken: 'page2',
            })

            await cache.update({ offset: 100 })

            const firstPage = cache.getPage(PaginatedACSCache.FIRST_PAGE_TOKEN)
            expect(firstPage).toBeDefined()
            expect(firstPage.activeContracts).toHaveLength(1)
            expect(firstPage.activeAtOffset).toBe(100)
            expect(firstPage.nextPageToken).toBe('page2')
        })

        it('should return undefined for non-existent page token', async () => {
            await cache.update({ offset: 100 })

            const nonExistentPage = cache.getPage('non-existent-token')
            expect(nonExistentPage).toBeUndefined()
        })

        it('should retrieve page after fetching it with pageToken option', async () => {
            await cache.update({ offset: 100 })

            getPaginatedActiveContracts.mockResolvedValueOnce({
                activeContracts: [
                    {
                        workflowId: 'id3',
                        contractEntry: {
                            JsActiveContract: {
                                createdEvent: {
                                    contractId: 'page2-contract',
                                    templateId: 'template3',
                                    offset: 200,
                                },
                                synchronizerId: 'sync1',
                                reassignmentCounter: 0,
                            },
                        },
                    },
                ],
                activeAtOffset: 200,
                nextPageToken: '',
            })

            await cache.update({ offset: 200, pageToken: 'page2Token' })

            const page2 = cache.getPage('page2Token')
            expect(page2).toBeDefined()
            expect(page2.activeContracts).toHaveLength(1)
            expect(
                page2.activeContracts[0].contractEntry &&
                    'JsActiveContract' in page2.activeContracts[0].contractEntry
                    ? page2.activeContracts[0].contractEntry.JsActiveContract
                          .createdEvent.contractId
                    : undefined
            ).toBe('page2-contract')
        })
    })
})
