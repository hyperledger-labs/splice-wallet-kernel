// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACSReader } from '../reader'

const { mockCacheCollection, MockACSCacheCollection } = vi.hoisted(() => {
    const readFromCache = vi.fn()

    const mockCacheCollection = {
        readFromCache,
    }

    const MockACSCacheCollection = vi.fn(
        class {
            readFromCache = readFromCache
        }
    )

    return { mockCacheCollection, MockACSCacheCollection }
})

const { mockService, MockAcsService } = vi.hoisted(() => {
    const getActiveContracts = vi.fn()
    const getPaginatedActiveContracts = vi.fn()

    const mockService = {
        getActiveContracts,
        getPaginatedActiveContracts,
    }

    const MockAcsService = vi.fn(
        class {
            getActiveContracts = getActiveContracts
            getPaginatedActiveContracts = getPaginatedActiveContracts
        }
    )

    return { mockService, MockAcsService }
})

vi.mock('../cache/collection', () => {
    return {
        ACSCacheCollection: MockACSCacheCollection,
        PaginatedACSCacheCollection: MockACSCacheCollection,
    }
})

vi.mock('../service', () => {
    return {
        AcsService: MockAcsService,
    }
})

const ledgerProvider = vi.hoisted(() => ({
    request: vi.fn(),
}))

describe('reader', () => {
    let reader: ACSReader

    const createMockContract = (id: string, party: string, syncId: string) => ({
        workflowId: `wf-${id}`,
        contractEntry: {
            JsActiveContract: {
                createdEvent: {
                    contractId: `contract-${id}`,
                    templateId: `template${id}`,
                    contractKey: null,
                    createArguments: {},
                    createdAt: '2024-01-01T00:00:00Z',
                    signatories: [party],
                    observers: [],
                },
                synchronizerId: syncId,
                reassignmentCounter: 0,
            },
        },
    })

    const mockActiveContracts = [
        createMockContract('1', 'party1', 'sync1'),
        createMockContract('2', 'party2', 'sync2'),
    ]

    const expectLedgerEndCalled = () => {
        expect(ledgerProvider.request).toHaveBeenCalledWith({
            method: 'ledgerApi',
            params: {
                resource: '/v2/state/ledger-end',
                requestMethod: 'get',
                query: {},
            },
        })
    }

    beforeEach(() => {
        mockService.getActiveContracts.mockResolvedValue(mockActiveContracts)
        mockService.getPaginatedActiveContracts.mockResolvedValue({
            activeContracts: mockActiveContracts,
            activeAtOffset: 100,
            nextPageToken: '',
        })
        mockCacheCollection.readFromCache.mockResolvedValue(mockActiveContracts)
        ledgerProvider.request.mockResolvedValue({ offset: 1000 })
        reader = new ACSReader(ledgerProvider)
    })

    it('should initialize cache collection and service', () => {
        expect(MockACSCacheCollection).toHaveBeenCalledWith(
            ledgerProvider,
            undefined
        )
        expect(MockAcsService).toHaveBeenCalledWith(ledgerProvider)
    })

    it('should initialize with custom cache options', () => {
        const cacheOptions = {
            maxSize: 50,
            entryExpirationTimeInMS: 5 * 60 * 1000,
        }

        new ACSReader(ledgerProvider, cacheOptions)

        expect(MockACSCacheCollection).toHaveBeenCalledWith(
            ledgerProvider,
            cacheOptions
        )
    })

    describe('raw.read', () => {
        it('should read active contracts directly without cache', async () => {
            const options = {
                offset: 100,
                parties: ['party1'],
                templateIds: ['template1'],
            }
            const result = await reader.raw.read(options)

            expect(mockService.getActiveContracts).toHaveBeenCalledWith(options)
            expect(result).toEqual(mockActiveContracts)
            expect(mockCacheCollection.readFromCache).not.toHaveBeenCalled()
        })

        it('should resolve offset when not provided', async () => {
            ledgerProvider.request.mockResolvedValue({ offset: 500 })
            await reader.raw.read({
                parties: ['party1'],
                templateIds: ['template1'],
            })

            expectLedgerEndCalled()
            expect(mockService.getActiveContracts).toHaveBeenCalledWith(
                expect.objectContaining({ offset: 500 })
            )
        })

        it('should handle empty results', async () => {
            mockService.getActiveContracts.mockResolvedValue([])
            expect(
                await reader.raw.read({ offset: 100, parties: ['party1'] })
            ).toEqual([])
        })
    })

    describe('raw.readJsContracts', () => {
        it('should read and transform to JS contracts', async () => {
            const result = await reader.raw.readJsContracts({
                offset: 100,
                parties: ['party1'],
                templateIds: ['template1'],
            })

            expect(result).toHaveLength(2)
            expect(result[0]).toMatchObject({
                contractId: 'contract-1',
                templateId: 'template1',
                synchronizerId: 'sync1',
            })
        })

        it('should filter out contracts without JsActiveContract', async () => {
            mockService.getActiveContracts.mockResolvedValue([
                ...mockActiveContracts,
                { workflowId: 'wf3', contractEntry: null },
                { workflowId: 'wf4', contractEntry: { OtherType: {} } },
            ])

            const result = await reader.raw.readJsContracts({
                offset: 100,
                parties: ['party1'],
            })
            expect(result).toHaveLength(2)
        })

        it('should return empty array when no contracts', async () => {
            mockService.getActiveContracts.mockResolvedValue([])
            expect(
                await reader.raw.readJsContracts({
                    offset: 100,
                    parties: ['party1'],
                })
            ).toEqual([])
        })
    })

    describe('read', () => {
        it('should read active contracts from cache', async () => {
            const options = {
                offset: 100,
                parties: ['party1'],
                templateIds: ['template1'],
            }
            const result = await reader.read(options)

            expect(mockCacheCollection.readFromCache).toHaveBeenCalledWith(
                options
            )
            expect(result).toEqual(mockActiveContracts)
            expect(mockService.getActiveContracts).not.toHaveBeenCalled()
        })

        it('should resolve offset when not provided', async () => {
            ledgerProvider.request.mockResolvedValue({ offset: 750 })
            await reader.read({
                parties: ['party1'],
                templateIds: ['template1'],
            })

            expectLedgerEndCalled()
            expect(mockCacheCollection.readFromCache).toHaveBeenCalledWith(
                expect.objectContaining({ offset: 750 })
            )
        })

        it('should handle empty cache results', async () => {
            mockCacheCollection.readFromCache.mockResolvedValue([])
            expect(
                await reader.read({ offset: 100, parties: ['party1'] })
            ).toEqual([])
        })

        it.each([
            [
                'multiple parties and templates',
                {
                    offset: 200,
                    parties: ['party1', 'party2'],
                    templateIds: ['template1', 'template2'],
                },
            ],
            [
                'interface IDs',
                {
                    offset: 200,
                    parties: ['party1'],
                    interfaceIds: ['interface1'],
                },
            ],
        ])('should work with %s', async (_, options) => {
            await reader.read(options)
            expect(mockCacheCollection.readFromCache).toHaveBeenCalledWith(
                options
            )
        })
    })

    describe('readJsContracts', () => {
        it('should read from cache and transform to JS contracts', async () => {
            const result = await reader.readJsContracts({
                offset: 100,
                parties: ['party1'],
                templateIds: ['template1'],
            })

            expect(result).toHaveLength(2)
            expect(result[0]).toMatchObject({
                contractId: 'contract-1',
                synchronizerId: 'sync1',
            })
            expect(result[1]).toMatchObject({
                contractId: 'contract-2',
                synchronizerId: 'sync2',
            })
        })

        it('should filter out contracts without JsActiveContract', async () => {
            mockCacheCollection.readFromCache.mockResolvedValue([
                mockActiveContracts[0],
                { workflowId: 'wf3', contractEntry: null },
                mockActiveContracts[1],
                { workflowId: 'wf4', contractEntry: { OtherType: {} } },
            ])

            const result = await reader.readJsContracts({
                offset: 100,
                parties: ['party1'],
            })
            expect(result).toHaveLength(2)
            expect(result.map((c) => c.contractId)).toEqual([
                'contract-1',
                'contract-2',
            ])
        })

        it('should return empty array when cache is empty', async () => {
            mockCacheCollection.readFromCache.mockResolvedValue([])
            expect(
                await reader.readJsContracts({
                    offset: 100,
                    parties: ['party1'],
                })
            ).toEqual([])
        })

        it('should resolve offset before reading from cache', async () => {
            ledgerProvider.request.mockResolvedValue({ offset: 999 })
            await reader.readJsContracts({
                parties: ['party1'],
                templateIds: ['template1'],
            })

            expectLedgerEndCalled()
            expect(mockCacheCollection.readFromCache).toHaveBeenCalledWith(
                expect.objectContaining({ offset: 999 })
            )
        })
    })

    describe('error handling', () => {
        it.each([
            [
                'service',
                () =>
                    mockService.getActiveContracts.mockRejectedValue(
                        new Error('Service error')
                    ),
                () => reader.raw.read({ offset: 100, parties: ['party1'] }),
                'Service error',
            ],
            [
                'cache',
                () =>
                    mockCacheCollection.readFromCache.mockRejectedValue(
                        new Error('Cache error')
                    ),
                () => reader.read({ offset: 100, parties: ['party1'] }),
                'Cache error',
            ],
            [
                'ledger-end',
                () =>
                    ledgerProvider.request.mockRejectedValue(
                        new Error('Ledger error')
                    ),
                () => reader.read({ parties: ['party1'] }),
                'Ledger error',
            ],
        ])(
            'should propagate errors from %s',
            async (_, setupError, action, expectedError) => {
                setupError()
                await expect(action()).rejects.toThrow(expectedError)
            }
        )
    })

    describe('paginated', () => {
        const createPagedMocks = (pages: number = 1) => {
            if (pages === 1) {
                return {
                    activeContracts: mockActiveContracts,
                    activeAtOffset: 100,
                    nextPageToken: '',
                }
            }
            return Array.from({ length: pages }, (_, i) => ({
                activeContracts: [mockActiveContracts[i]],
                activeAtOffset: 100 * (i + 1),
                nextPageToken: i < pages - 1 ? `page${i + 2}` : '',
            }))
        }

        describe('raw.read', () => {
            it('should read paginated active contracts directly without cache', async () => {
                mockService.getPaginatedActiveContracts.mockResolvedValue(
                    createPagedMocks()
                )
                const options = {
                    offset: 100,
                    parties: ['party1'],
                    templateIds: ['template1'],
                }

                const result = await reader.paginated.raw.read(options)

                expect(
                    mockService.getPaginatedActiveContracts
                ).toHaveBeenCalledWith(options)
                expect(result).toEqual(mockActiveContracts)
                expect(mockCacheCollection.readFromCache).not.toHaveBeenCalled()
            })

            it('should handle multiple pages when continueUntilCompletion is true', async () => {
                mockService.getPaginatedActiveContracts.mockResolvedValue(
                    createPagedMocks(2)
                )

                const result = await reader.paginated.raw.read({
                    offset: 100,
                    parties: ['party1'],
                    continueUntilCompletion: true,
                })

                expect(result).toEqual(mockActiveContracts)
            })

            it('should resolve offset when not provided', async () => {
                ledgerProvider.request.mockResolvedValue({ offset: 500 })
                await reader.paginated.raw.read({
                    parties: ['party1'],
                    templateIds: ['template1'],
                })

                expectLedgerEndCalled()
                expect(
                    mockService.getPaginatedActiveContracts
                ).toHaveBeenCalledWith(expect.objectContaining({ offset: 500 }))
            })

            it('should handle empty page results', async () => {
                mockService.getPaginatedActiveContracts.mockResolvedValue({
                    activeContracts: [],
                    activeAtOffset: 100,
                    nextPageToken: '',
                })
                expect(
                    await reader.paginated.raw.read({
                        offset: 100,
                        parties: ['party1'],
                    })
                ).toEqual([])
            })

            it.each([
                ['pageToken', { pageToken: 'customToken' }],
                ['maxPageSize', { maxPageSize: 50 }],
            ])('should include %s when provided', async (_, extraOptions) => {
                const options = {
                    offset: 100,
                    parties: ['party1'],
                    ...extraOptions,
                }
                await reader.paginated.raw.read(options)
                expect(
                    mockService.getPaginatedActiveContracts
                ).toHaveBeenCalledWith(options)
            })
        })

        describe('raw.readJsContracts', () => {
            it('should read and transform paginated contracts to JS contracts', async () => {
                mockService.getPaginatedActiveContracts.mockResolvedValue(
                    createPagedMocks()
                )

                const result = await reader.paginated.raw.readJsContracts({
                    offset: 100,
                    parties: ['party1'],
                    templateIds: ['template1'],
                })

                expect(result).toHaveLength(2)
                expect(result[0]).toMatchObject({
                    contractId: 'contract-1',
                    synchronizerId: 'sync1',
                })
            })

            it('should handle multiple pages and flatten results', async () => {
                mockService.getPaginatedActiveContracts.mockResolvedValue(
                    createPagedMocks(2)
                )

                const result = await reader.paginated.raw.readJsContracts({
                    offset: 100,
                    parties: ['party1'],
                    continueUntilCompletion: true,
                })

                expect(result).toHaveLength(2)
                expect(result.map((c) => c.contractId)).toEqual([
                    'contract-1',
                    'contract-2',
                ])
            })

            it('should filter out contracts without JsActiveContract', async () => {
                mockService.getPaginatedActiveContracts.mockResolvedValue({
                    activeContracts: [
                        ...mockActiveContracts,
                        { workflowId: 'wf3', contractEntry: null },
                    ],
                    activeAtOffset: 100,
                    nextPageToken: '',
                })

                const result = await reader.paginated.raw.readJsContracts({
                    offset: 100,
                    parties: ['party1'],
                })
                expect(result).toHaveLength(2)
            })
        })

        describe('read', () => {
            it('should read paginated active contracts from cache', async () => {
                const options = {
                    offset: 100,
                    parties: ['party1'],
                    templateIds: ['template1'],
                }
                const result = await reader.paginated.read(options)

                expect(mockCacheCollection.readFromCache).toHaveBeenCalledWith(
                    options
                )
                expect(result).toEqual(mockActiveContracts)
                expect(
                    mockService.getPaginatedActiveContracts
                ).not.toHaveBeenCalled()
            })

            it('should resolve offset when not provided', async () => {
                ledgerProvider.request.mockResolvedValue({ offset: 750 })
                await reader.paginated.read({
                    parties: ['party1'],
                    templateIds: ['template1'],
                })

                expectLedgerEndCalled()
                expect(mockCacheCollection.readFromCache).toHaveBeenCalledWith(
                    expect.objectContaining({ offset: 750 })
                )
            })

            it.each([
                ['pageToken', { pageToken: 'token123' }],
                ['maxPageSize', { maxPageSize: 100 }],
            ])('should work with %s option', async (_, extraOptions) => {
                const options = {
                    offset: 200,
                    parties: ['party1'],
                    ...extraOptions,
                }
                await reader.paginated.read(options)
                expect(mockCacheCollection.readFromCache).toHaveBeenCalledWith(
                    options
                )
            })

            it('should handle empty cache results', async () => {
                mockCacheCollection.readFromCache.mockResolvedValue([])
                expect(
                    await reader.paginated.read({
                        offset: 100,
                        parties: ['party1'],
                    })
                ).toEqual([])
            })
        })

        describe('readJsContracts', () => {
            it('should read paginated from cache and transform to JS contracts', async () => {
                const result = await reader.paginated.readJsContracts({
                    offset: 100,
                    parties: ['party1'],
                    templateIds: ['template1'],
                })

                expect(result).toHaveLength(2)
                expect(result[0]).toMatchObject({
                    contractId: 'contract-1',
                    synchronizerId: 'sync1',
                })
            })

            it('should filter out contracts without JsActiveContract from cache', async () => {
                mockCacheCollection.readFromCache.mockResolvedValue([
                    mockActiveContracts[0],
                    { workflowId: 'wf3', contractEntry: null },
                    mockActiveContracts[1],
                ])

                const result = await reader.paginated.readJsContracts({
                    offset: 100,
                    parties: ['party1'],
                })
                expect(result.map((c) => c.contractId)).toEqual([
                    'contract-1',
                    'contract-2',
                ])
            })

            it('should resolve offset before reading from cache', async () => {
                ledgerProvider.request.mockResolvedValue({ offset: 999 })
                await reader.paginated.readJsContracts({
                    parties: ['party1'],
                    templateIds: ['template1'],
                })

                expectLedgerEndCalled()
                expect(mockCacheCollection.readFromCache).toHaveBeenCalledWith(
                    expect.objectContaining({ offset: 999 })
                )
            })

            it('should return empty array when cache is empty', async () => {
                mockCacheCollection.readFromCache.mockResolvedValue([])
                expect(
                    await reader.paginated.readJsContracts({
                        offset: 100,
                        parties: ['party1'],
                    })
                ).toEqual([])
            })
        })

        describe('error handling', () => {
            it.each([
                [
                    'paginated service',
                    () =>
                        mockService.getPaginatedActiveContracts.mockRejectedValue(
                            new Error('Paginated service error')
                        ),
                    () =>
                        reader.paginated.raw.read({
                            offset: 100,
                            parties: ['party1'],
                        }),
                    'Paginated service error',
                ],
                [
                    'paginated cache',
                    () =>
                        mockCacheCollection.readFromCache.mockRejectedValue(
                            new Error('Paginated cache error')
                        ),
                    () =>
                        reader.paginated.read({
                            offset: 100,
                            parties: ['party1'],
                        }),
                    'Paginated cache error',
                ],
                [
                    'ledger-end in paginated mode',
                    () =>
                        ledgerProvider.request.mockRejectedValue(
                            new Error('Ledger error in paginated')
                        ),
                    () => reader.paginated.read({ parties: ['party1'] }),
                    'Ledger error in paginated',
                ],
            ])(
                'should propagate errors from %s',
                async (_, setupError, action, expectedError) => {
                    setupError()
                    await expect(action()).rejects.toThrow(expectedError)
                }
            )
        })
    })
})
