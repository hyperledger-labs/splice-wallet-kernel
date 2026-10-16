// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACSCache } from '../../../cache/item'

const { getActiveContracts, MockACSService, mockBuildActiveContractFilter } =
    vi.hoisted(() => {
        const getActiveContracts = vi.fn()
        const mockBuildActiveContractFilter = vi.fn((options) => ({
            eventFormat: { filtersByParty: {}, verbose: false },
            activeAtOffset: options.offset,
        }))

        const MockACSService = vi.fn(
            class {
                getActiveContracts = getActiveContracts
            }
        )

        return {
            getActiveContracts,
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

describe('cache - item', () => {
    let cache: ACSCache

    beforeEach(() => {
        getActiveContracts.mockReturnValue([
            {
                workflowId: 'id1',
                contractEntry: {
                    JsActiveContract: {
                        createdEvent: {
                            contractId: 'initial-contract-1',
                            templateId: 'template1',
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
                        },
                        synchronizerId: 'sync2',
                        reassignmentCounter: 0,
                    },
                },
            },
        ])

        ledgerProvider.request.mockResolvedValue([])

        cache = new ACSCache(ledgerProvider)
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
            expect(getActiveContracts).toHaveBeenCalledExactlyOnceWith(
                updateOptions
            )
        })

        it('should init state when initial.offset > options.offset', async () => {
            await cache.update({ offset: 200 })

            // Second update with lower offset should trigger initState again
            await cache.update({ offset: 100 })

            expect(getActiveContracts).toHaveBeenCalledWith({ offset: 100 })
        })

        it('should fetch updates with correct parameters', async () => {
            const mockUpdates = [
                {
                    update: {
                        OffsetCheckpoint: {
                            value: { offset: 150 },
                        },
                    },
                },
            ]
            ledgerProvider.request.mockResolvedValueOnce(mockUpdates)

            await cache.update({ offset: 100 })

            await cache.update({ offset: 200 })

            expect(ledgerProvider.request).toHaveBeenCalledWith(
                expect.objectContaining({
                    method: 'ledgerApi',
                    params: expect.objectContaining({
                        resource: '/v2/updates',
                        requestMethod: 'post',
                        body: expect.objectContaining({
                            beginExclusive: 150,
                            endInclusive: 200,
                        }),
                    }),
                })
            )
        })

        it('should recursively call update when reaching maxUpdatesToFetch', async () => {
            // Create exactly 100 updates (the maxUpdatesToFetch limit)
            const mockUpdates = Array.from({ length: 100 }, (_, i) => ({
                update: {
                    OffsetCheckpoint: {
                        value: { offset: 100 + i },
                    },
                },
            }))

            ledgerProvider.request.mockResolvedValueOnce(mockUpdates)

            await cache.update({ offset: 100 })

            // Should have made multiple requests due to recursive call
            expect(ledgerProvider.request).toHaveBeenCalledTimes(2)
        })

        it('should handle archived events correctly', async () => {
            const mockUpdates = [
                {
                    update: {
                        Transaction: {
                            value: {
                                offset: 150,
                                workflowId: 'wf1',
                                synchronizerId: 'sync1',
                                events: [
                                    {
                                        ArchivedEvent: {
                                            contractId: 'initial-contract-1',
                                            templateId: { value: 'template1' },
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
            ]
            ledgerProvider.request.mockResolvedValue(mockUpdates)

            await cache.update({ offset: 100 })

            await cache.update({ offset: 200 })

            // Should process archived events without errors
            expect(ledgerProvider.request).toHaveBeenCalledTimes(2)
        })
    })

    describe('calculateAt', () => {
        it('should throw error when offset is smaller than initial offset', async () => {
            await cache.update({ offset: 200 })

            expect(() => cache.calculateAt(100)).toThrow()
        })

        it('should return initial contracts when no updates have been applied', async () => {
            await cache.update({ offset: 100 })

            const result = cache.calculateAt(100)

            const expectedResult = getActiveContracts()

            expect(result).toHaveLength(2)
            expect(result[0]).toMatchObject(expectedResult[0])
            expect(result[1]).toMatchObject(expectedResult[1])
        })

        it('should include new created contracts in the result', async () => {
            await cache.update({ offset: 100 })

            const mockUpdates = [
                {
                    update: {
                        Transaction: {
                            value: {
                                offset: 150,
                                workflowId: 'wf1',
                                synchronizerId: 'sync1',
                                events: [
                                    {
                                        CreatedEvent: {
                                            contractId: 'new-contract-1',
                                            templateId: { value: 'template3' },
                                            contractKey: null,
                                            createArguments: {},
                                            createdAt: '2024-01-01T00:00:00Z',
                                            signatories: [],
                                            observers: [],
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
            ]
            ledgerProvider.request.mockResolvedValueOnce(mockUpdates)

            await cache.update({ offset: 200 })

            const result = cache.calculateAt(200)

            expect(result).toHaveLength(3)
            expect(
                result.some(
                    (c) =>
                        c.contractEntry &&
                        'JsActiveContract' in c.contractEntry &&
                        c.contractEntry.JsActiveContract.createdEvent
                            .contractId === 'new-contract-1'
                )
            ).toBe(true)
        })

        it('should handle multiple created and archived events correctly', async () => {
            await cache.update({ offset: 100 })

            const mockUpdates = [
                {
                    update: {
                        Transaction: {
                            value: {
                                offset: 150,
                                workflowId: 'wf1',
                                synchronizerId: 'sync1',
                                events: [
                                    {
                                        CreatedEvent: {
                                            contractId: 'new-contract-1',
                                            templateId: { value: 'template3' },
                                            contractKey: null,
                                            createArguments: {},
                                            createdAt: '2024-01-01T00:00:00Z',
                                            signatories: [],
                                            observers: [],
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
                {
                    update: {
                        Transaction: {
                            value: {
                                offset: 160,
                                workflowId: 'wf2',
                                synchronizerId: 'sync1',
                                events: [
                                    {
                                        CreatedEvent: {
                                            contractId: 'new-contract-2',
                                            templateId: { value: 'template4' },
                                            contractKey: null,
                                            createArguments: {},
                                            createdAt: '2024-01-01T00:00:00Z',
                                            signatories: [],
                                            observers: [],
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
                {
                    update: {
                        Transaction: {
                            value: {
                                offset: 170,
                                workflowId: 'wf3',
                                synchronizerId: 'sync1',
                                events: [
                                    {
                                        ArchivedEvent: {
                                            contractId: 'new-contract-1',
                                            templateId: { value: 'template3' },
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
            ]
            ledgerProvider.request.mockResolvedValueOnce(mockUpdates)

            await cache.update({ offset: 200 })

            const result = cache.calculateAt(200)

            // Should have: initial-contract-1, initial-contract-2, new-contract-2
            // new-contract-1 was created and then archived
            expect(result).toHaveLength(3)
            expect(
                result.some(
                    (c) =>
                        c.contractEntry &&
                        'JsActiveContract' in c.contractEntry &&
                        c.contractEntry.JsActiveContract.createdEvent
                            .contractId === 'new-contract-1'
                )
            ).toBe(false)
            expect(
                result.some(
                    (c) =>
                        c.contractEntry &&
                        'JsActiveContract' in c.contractEntry &&
                        c.contractEntry.JsActiveContract.createdEvent
                            .contractId === 'new-contract-2'
                )
            ).toBe(true)
        })

        it('should work correctly when called multiple times with different offsets', async () => {
            await cache.update({ offset: 100 })

            const mockUpdates = [
                {
                    update: {
                        Transaction: {
                            value: {
                                offset: 150,
                                workflowId: 'wf1',
                                synchronizerId: 'sync1',
                                events: [
                                    {
                                        CreatedEvent: {
                                            contractId: 'contract-150',
                                            templateId: { value: 'template3' },
                                            contractKey: null,
                                            createArguments: {},
                                            createdAt: '2024-01-01T00:00:00Z',
                                            signatories: [],
                                            observers: [],
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
                {
                    update: {
                        Transaction: {
                            value: {
                                offset: 200,
                                workflowId: 'wf2',
                                synchronizerId: 'sync1',
                                events: [
                                    {
                                        CreatedEvent: {
                                            contractId: 'contract-200',
                                            templateId: { value: 'template4' },
                                            contractKey: null,
                                            createArguments: {},
                                            createdAt: '2024-01-01T00:00:00Z',
                                            signatories: [],
                                            observers: [],
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
            ]
            ledgerProvider.request.mockResolvedValueOnce(mockUpdates)

            await cache.update({ offset: 250 })

            const resultAt150 = cache.calculateAt(150)
            expect(resultAt150).toHaveLength(3) // 2 initial + 1 at 150

            const resultAt180 = cache.calculateAt(180)
            expect(resultAt180).toHaveLength(3) // 2 initial + 1 at 150

            const resultAt250 = cache.calculateAt(250)
            expect(resultAt250).toHaveLength(4) // 2 initial + 1 at 150 + 1 at 200
        })

        it('should handle empty contract entries gracefully', async () => {
            const mockUpdates = [
                {
                    update: {
                        Transaction: {
                            value: {
                                offset: 150,
                                workflowId: 'wf1',
                                synchronizerId: 'sync1',
                                events: [
                                    {
                                        CreatedEvent: {
                                            contractId: 'new-contract',
                                            templateId: { value: 'template3' },
                                            contractKey: null,
                                            createArguments: {},
                                            createdAt: '2024-01-01T00:00:00Z',
                                            signatories: [],
                                            observers: [],
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
            ]
            ledgerProvider.request.mockResolvedValue(mockUpdates)

            await cache.update({ offset: 200 })

            const result = cache.calculateAt(200)

            // Should filter out any entries without contractEntry
            expect(
                result.every(({ contractEntry }) => Boolean(contractEntry))
            ).toBe(true)
        })
    })
})
