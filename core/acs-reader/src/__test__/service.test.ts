// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AcsService, buildActiveContractFilter } from '../service'
import { PaginatedACSCache } from '../cache/item'

const ledgerProvider = vi.hoisted(() => ({
    request: vi.fn(),
}))

describe('service', () => {
    let service: AcsService

    const mockActiveContracts = [
        {
            workflowId: 'wf1',
            contractEntry: {
                JsActiveContract: {
                    createdEvent: {
                        contractId: 'contract-1',
                        templateId: 'template1',
                        contractKey: null,
                        createArguments: {},
                        createdAt: '2024-01-01T00:00:00Z',
                        signatories: ['party1'],
                        observers: [],
                    },
                    synchronizerId: 'sync1',
                    reassignmentCounter: 0,
                },
            },
        },
    ]

    beforeEach(() => {
        ledgerProvider.request.mockResolvedValue(mockActiveContracts)

        service = new AcsService(ledgerProvider)
    })

    describe('getActiveContracts', () => {
        it('should fetch active contracts with basic options', async () => {
            const options = {
                offset: 100,
                parties: ['party1'],
                templateIds: ['template1'],
            }

            const result = await service.getActiveContracts(options)

            expect(ledgerProvider.request).toHaveBeenCalledWith({
                method: 'ledgerApi',
                params: {
                    resource: '/v2/state/active-contracts',
                    requestMethod: 'post',
                    body: expect.objectContaining({
                        activeAtOffset: 100,
                        eventFormat: expect.objectContaining({
                            verbose: false,
                        }),
                    }),
                    query: {},
                },
            })
            expect(result).toEqual(mockActiveContracts)
        })

        it('should include limit in query when provided', async () => {
            const options = {
                offset: 100,
                parties: ['party1'],
                limit: 50,
            }

            await service.getActiveContracts(options)

            expect(ledgerProvider.request).toHaveBeenCalledWith({
                method: 'ledgerApi',
                params: {
                    resource: '/v2/state/active-contracts',
                    requestMethod: 'post',
                    body: expect.anything(),
                    query: { limit: 50 },
                },
            })
        })

        it('should use default limit of 200 when continueUntilCompletion is true', async () => {
            ledgerProvider.request.mockResolvedValueOnce({ offset: 1000 })

            const options = {
                offset: 100,
                parties: ['party1'],
                continueUntilCompletion: true,
            }

            await service.getActiveContracts(options)

            expect(ledgerProvider.request).toHaveBeenCalledWith(
                expect.objectContaining({
                    method: 'ledgerApi',
                    params: expect.objectContaining({
                        resource: '/v2/updates',
                        query: { limit: 200 },
                    }),
                })
            )
        })

        it('should use custom limit when continueUntilCompletion is true', async () => {
            ledgerProvider.request.mockResolvedValueOnce({ offset: 1000 })

            const options = {
                offset: 100,
                parties: ['party1'],
                continueUntilCompletion: true,
                limit: 150,
            }

            await service.getActiveContracts(options)

            expect(ledgerProvider.request).toHaveBeenCalledWith(
                expect.objectContaining({
                    method: 'ledgerApi',
                    params: expect.objectContaining({
                        resource: '/v2/updates',
                        query: { limit: 150 },
                    }),
                })
            )
        })

        it('should scan whole ledger when continueUntilCompletion is true', async () => {
            ledgerProvider.request
                .mockResolvedValueOnce({ offset: 200 })
                .mockResolvedValueOnce([
                    {
                        update: {
                            Transaction: {
                                value: {
                                    offset: 200,
                                    workflowId: 'wf1',
                                    synchronizerId: 'sync1',
                                    events: [
                                        {
                                            CreatedEvent: {
                                                contractId: 'contract-1',
                                                templateId: {
                                                    value: 'template1',
                                                },
                                                contractKey: null,
                                                createArgument: {
                                                    owner: 'party1',
                                                },
                                                createdAt:
                                                    '2024-01-01T00:00:00Z',
                                                signatories: ['party1'],
                                                observers: [],
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                ])

            const options = {
                offset: 100,
                parties: ['party1'],
                continueUntilCompletion: true,
                filterByParty: true,
            }

            const result = await service.getActiveContracts(options)

            expect(ledgerProvider.request).toHaveBeenCalledTimes(2)
            expect(result).toHaveLength(1)
            expect(result[0].contractEntry).toHaveProperty('JsActiveContract')
        })

        it('should handle archived events when scanning ledger', async () => {
            ledgerProvider.request
                .mockResolvedValueOnce({ offset: 300 })
                .mockResolvedValueOnce([
                    {
                        update: {
                            Transaction: {
                                value: {
                                    offset: 200,
                                    workflowId: 'wf1',
                                    synchronizerId: 'sync1',
                                    events: [
                                        {
                                            CreatedEvent: {
                                                contractId: 'contract-1',
                                                templateId: {
                                                    value: 'template1',
                                                },
                                                contractKey: null,
                                                createArgument: {
                                                    owner: 'party1',
                                                },
                                                createdAt:
                                                    '2024-01-01T00:00:00Z',
                                                signatories: ['party1'],
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
                                    offset: 300,
                                    workflowId: 'wf2',
                                    synchronizerId: 'sync1',
                                    events: [
                                        {
                                            ArchivedEvent: {
                                                contractId: 'contract-1',
                                                templateId: {
                                                    value: 'template1',
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                ])

            const options = {
                offset: 100,
                parties: ['party1'],
                continueUntilCompletion: true,
                filterByParty: true,
            }

            const result = await service.getActiveContracts(options)

            expect(result).toHaveLength(0)
        })

        it('should handle consuming exercised events when scanning ledger', async () => {
            ledgerProvider.request
                .mockResolvedValueOnce({ offset: 300 })
                .mockResolvedValueOnce([
                    {
                        update: {
                            Transaction: {
                                value: {
                                    offset: 200,
                                    workflowId: 'wf1',
                                    synchronizerId: 'sync1',
                                    events: [
                                        {
                                            CreatedEvent: {
                                                contractId: 'contract-1',
                                                templateId: {
                                                    value: 'template1',
                                                },
                                                contractKey: null,
                                                createArgument: {
                                                    owner: 'party1',
                                                },
                                                createdAt:
                                                    '2024-01-01T00:00:00Z',
                                                signatories: ['party1'],
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
                                    offset: 300,
                                    workflowId: 'wf2',
                                    synchronizerId: 'sync1',
                                    events: [
                                        {
                                            ExercisedEvent: {
                                                contractId: 'contract-1',
                                                templateId: {
                                                    value: 'template1',
                                                },
                                                consuming: true,
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                ])

            const options = {
                offset: 100,
                parties: ['party1'],
                continueUntilCompletion: true,
                filterByParty: true,
            }

            const result = await service.getActiveContracts(options)

            expect(result).toHaveLength(0)
        })

        it('should not remove contracts with non-consuming exercised events', async () => {
            ledgerProvider.request
                .mockResolvedValueOnce({ offset: 300 })
                .mockResolvedValueOnce([
                    {
                        update: {
                            Transaction: {
                                value: {
                                    offset: 200,
                                    workflowId: 'wf1',
                                    synchronizerId: 'sync1',
                                    events: [
                                        {
                                            CreatedEvent: {
                                                contractId: 'contract-1',
                                                templateId: {
                                                    value: 'template1',
                                                },
                                                contractKey: null,
                                                createArgument: {
                                                    owner: 'party1',
                                                },
                                                createdAt:
                                                    '2024-01-01T00:00:00Z',
                                                signatories: ['party1'],
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
                                    offset: 300,
                                    workflowId: 'wf2',
                                    synchronizerId: 'sync1',
                                    events: [
                                        {
                                            ExercisedEvent: {
                                                contractId: 'contract-1',
                                                templateId: {
                                                    value: 'template1',
                                                },
                                                consuming: false,
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                ])

            const options = {
                offset: 100,
                parties: ['party1'],
                continueUntilCompletion: true,
                filterByParty: true,
            }

            const result = await service.getActiveContracts(options)

            expect(result).toHaveLength(1)
        })

        it('should handle multiple batches when scanning ledger', async () => {
            ledgerProvider.request
                .mockResolvedValueOnce({ offset: 400 })
                .mockResolvedValueOnce([
                    {
                        update: {
                            Transaction: {
                                value: {
                                    offset: 200,
                                    workflowId: 'wf1',
                                    synchronizerId: 'sync1',
                                    events: [
                                        {
                                            CreatedEvent: {
                                                contractId: 'contract-1',
                                                templateId: {
                                                    value: 'template1',
                                                },
                                                contractKey: null,
                                                createArgument: {
                                                    owner: 'party1',
                                                },
                                                createdAt:
                                                    '2024-01-01T00:00:00Z',
                                                signatories: ['party1'],
                                                observers: [],
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                ])
                .mockResolvedValueOnce([
                    {
                        update: {
                            Transaction: {
                                value: {
                                    offset: 400,
                                    workflowId: 'wf2',
                                    synchronizerId: 'sync1',
                                    events: [
                                        {
                                            CreatedEvent: {
                                                contractId: 'contract-2',
                                                templateId: {
                                                    value: 'template1',
                                                },
                                                contractKey: null,
                                                createArgument: {
                                                    owner: 'party1',
                                                },
                                                createdAt:
                                                    '2024-01-01T00:00:00Z',
                                                signatories: ['party1'],
                                                observers: [],
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                ])

            const options = {
                offset: 100,
                parties: ['party1'],
                continueUntilCompletion: true,
                filterByParty: true,
            }

            const result = await service.getActiveContracts(options)

            expect(ledgerProvider.request).toHaveBeenCalledTimes(3)
            expect(result).toHaveLength(2)
        })
    })

    describe('getPaginatedActiveContracts', () => {
        const mockPageResponse = {
            activeContracts: [
                {
                    workflowId: 'wf1',
                    contractEntry: {
                        JsActiveContract: {
                            createdEvent: {
                                contractId: 'contract-1',
                                templateId: 'template1',
                                contractKey: null,
                                createArguments: {},
                                createdAt: '2024-01-01T00:00:00Z',
                                signatories: ['party1'],
                                observers: [],
                                offset: 100,
                            },
                            synchronizerId: 'sync1',
                            reassignmentCounter: 0,
                        },
                    },
                },
            ],
            activeAtOffset: 100,
            nextPageToken: '',
        }

        it('should properly construct request body when specific args are provided', async () => {
            ledgerProvider.request.mockResolvedValue(mockPageResponse)

            const options = {
                offset: 100,
                parties: ['party1'],
                pageToken: 'page2Token',
                maxPageSize: 50,
            }

            await service.getPaginatedActiveContracts(options)

            expect(ledgerProvider.request).toHaveBeenCalledWith({
                method: 'ledgerApi',
                params: {
                    resource: '/v2/state/active-contracts-page',
                    requestMethod: 'post',
                    body: expect.objectContaining({
                        pageToken: 'page2Token',
                        maxPageSize: 50,
                        activeAtOffset: 100,
                        eventFormat: expect.any(Object),
                    }),
                },
            })
        })

        it('should include filtersByParty when filterByParty is true', async () => {
            ledgerProvider.request.mockResolvedValue(mockPageResponse)

            const options = {
                offset: 100,
                parties: ['party1'],
                templateIds: ['template1'],
                filterByParty: true,
            }

            await service.getPaginatedActiveContracts(options)

            expect(ledgerProvider.request).toHaveBeenCalledWith({
                method: 'ledgerApi',
                params: {
                    resource: '/v2/state/active-contracts-page',
                    requestMethod: 'post',
                    body: expect.objectContaining({
                        eventFormat: expect.objectContaining({
                            filtersByParty: expect.any(Object),
                        }),
                    }),
                },
            })
        })

        it('should include filtersForAnyParty when filterByParty is false', async () => {
            ledgerProvider.request.mockResolvedValue(mockPageResponse)

            const options = {
                offset: 100,
                templateIds: ['template1'],
            }

            await service.getPaginatedActiveContracts(options)

            expect(ledgerProvider.request).toHaveBeenCalledWith({
                method: 'ledgerApi',
                params: {
                    resource: '/v2/state/active-contracts-page',
                    requestMethod: 'post',
                    body: expect.objectContaining({
                        eventFormat: expect.objectContaining({
                            filtersForAnyParty: expect.any(Object),
                        }),
                    }),
                },
            })
        })

        it('should fetch all pages when continueUntilCompletion is true', async () => {
            ledgerProvider.request
                .mockResolvedValueOnce({
                    activeContracts: [mockPageResponse.activeContracts[0]],
                    activeAtOffset: 100,
                    nextPageToken: 'page2',
                })
                .mockResolvedValueOnce({
                    activeContracts: [
                        {
                            workflowId: 'wf2',
                            contractEntry: {
                                JsActiveContract: {
                                    createdEvent: {
                                        contractId: 'contract-2',
                                        templateId: 'template1',
                                        contractKey: null,
                                        createArguments: {},
                                        createdAt: '2024-01-01T00:00:00Z',
                                        signatories: ['party1'],
                                        observers: [],
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
                            workflowId: 'wf3',
                            contractEntry: {
                                JsActiveContract: {
                                    createdEvent: {
                                        contractId: 'contract-3',
                                        templateId: 'template1',
                                        contractKey: null,
                                        createArguments: {},
                                        createdAt: '2024-01-01T00:00:00Z',
                                        signatories: ['party1'],
                                        observers: [],
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

            const options = {
                offset: 100,
                parties: ['party1'],
                templateIds: ['template1'],
                continueUntilCompletion: true,
            }

            const result = await service.getPaginatedActiveContracts(options)

            expect(ledgerProvider.request).toHaveBeenCalledTimes(3)
            expect(Array.isArray(result)).toBe(true)
            expect(result).toHaveLength(3)
            if (Array.isArray(result)) {
                expect(result[0].activeAtOffset).toBe(100)
                expect(result[1].activeAtOffset).toBe(200)
                expect(result[2].activeAtOffset).toBe(300)
            }
        })

        it('should stop pagination when nextPageToken is empty', async () => {
            ledgerProvider.request
                .mockResolvedValueOnce({
                    activeContracts: [mockPageResponse.activeContracts[0]],
                    activeAtOffset: 100,
                    nextPageToken: 'page2',
                })
                .mockResolvedValueOnce({
                    activeContracts: [],
                    activeAtOffset: 200,
                    nextPageToken: '',
                })

            const options = {
                offset: 100,
                parties: ['party1'],
                continueUntilCompletion: true,
            }

            const result = await service.getPaginatedActiveContracts(options)

            expect(ledgerProvider.request).toHaveBeenCalledTimes(2)
            expect(Array.isArray(result)).toBe(true)
            expect(result).toHaveLength(2)
        })

        it('should use correct pageToken in subsequent requests', async () => {
            ledgerProvider.request
                .mockResolvedValueOnce({
                    activeContracts: [],
                    activeAtOffset: 100,
                    nextPageToken: 'customToken1',
                })
                .mockResolvedValueOnce({
                    activeContracts: [],
                    activeAtOffset: 200,
                    nextPageToken: 'customToken2',
                })
                .mockResolvedValueOnce({
                    activeContracts: [],
                    activeAtOffset: 300,
                    nextPageToken: '',
                })

            const options = {
                offset: 100,
                parties: ['party1'],
                continueUntilCompletion: true,
            }

            await service.getPaginatedActiveContracts(options)

            expect(ledgerProvider.request).toHaveBeenNthCalledWith(
                1,
                expect.objectContaining({
                    params: expect.objectContaining({
                        body: expect.not.objectContaining({
                            pageToken: PaginatedACSCache.FIRST_PAGE_TOKEN,
                        }),
                    }),
                })
            )
            expect(ledgerProvider.request).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({
                    params: expect.objectContaining({
                        body: expect.objectContaining({
                            pageToken: 'customToken1',
                        }),
                    }),
                })
            )
            expect(ledgerProvider.request).toHaveBeenNthCalledWith(
                3,
                expect.objectContaining({
                    params: expect.objectContaining({
                        body: expect.objectContaining({
                            pageToken: 'customToken2',
                        }),
                    }),
                })
            )
        })
    })

    describe('buildActiveContractFilter', () => {
        it('should build filter with template IDs', () => {
            const filter = buildActiveContractFilter({
                offset: 100,
                templateIds: ['template1', 'template2'],
            })

            expect(filter.activeAtOffset).toBe(100)
            expect(filter.eventFormat.verbose).toBe(false)
            expect(
                filter.eventFormat.filtersForAnyParty?.cumulative
            ).toHaveLength(2)
            expect(
                filter.eventFormat.filtersForAnyParty?.cumulative?.[0]
                    ?.identifierFilter
            ).toHaveProperty('TemplateFilter')
        })

        it('should build filter with interface IDs', () => {
            const filter = buildActiveContractFilter({
                offset: 100,
                interfaceIds: ['interface1', 'interface2'],
            })

            expect(filter.activeAtOffset).toBe(100)
            expect(
                filter.eventFormat.filtersForAnyParty?.cumulative
            ).toHaveLength(2)
            expect(
                filter.eventFormat.filtersForAnyParty?.cumulative?.[0]
                    ?.identifierFilter
            ).toHaveProperty('InterfaceFilter')
        })

        it('should build filter by party with template IDs', () => {
            const filter = buildActiveContractFilter({
                offset: 100,
                parties: ['party1', 'party2'],
                templateIds: ['template1'],
                filterByParty: true,
            })

            expect(filter.eventFormat.filtersByParty).toHaveProperty('party1')
            expect(filter.eventFormat.filtersByParty).toHaveProperty('party2')
            expect(
                filter.eventFormat.filtersByParty?.['party1']?.cumulative
            ).toHaveLength(1)
        })

        it('should build filter by party with interface IDs', () => {
            const filter = buildActiveContractFilter({
                offset: 100,
                parties: ['party1'],
                interfaceIds: ['interface1'],
                filterByParty: true,
            })

            expect(filter.eventFormat.filtersByParty).toHaveProperty('party1')
            expect(
                filter.eventFormat.filtersByParty?.['party1']?.cumulative?.[0]
                    ?.identifierFilter
            ).toHaveProperty('InterfaceFilter')
        })

        it('should use empty cumulative filter when filterByParty is true without templates or interfaces', () => {
            const filter = buildActiveContractFilter({
                offset: 100,
                parties: ['party1'],
                filterByParty: true,
            })

            expect(filter.eventFormat.filtersByParty).toHaveProperty('party1')
            expect(
                filter.eventFormat.filtersByParty?.['party1']?.cumulative
            ).toHaveLength(0)
        })

        it('should include template metadata in filter', () => {
            const filter = buildActiveContractFilter({
                offset: 100,
                templateIds: ['template1'],
            })

            const identifierFilter =
                filter.eventFormat.filtersForAnyParty?.cumulative?.[0]
                    ?.identifierFilter

            expect(identifierFilter).toBeDefined()
            if (identifierFilter && 'TemplateFilter' in identifierFilter) {
                expect(identifierFilter.TemplateFilter.value.templateId).toBe(
                    'template1'
                )
                expect(
                    identifierFilter.TemplateFilter.value
                        .includeCreatedEventBlob
                ).toBe(true)
            } else {
                throw new Error('Expected TemplateFilter in identifierFilter')
            }
        })

        it('should include interface metadata in filter', () => {
            const filter = buildActiveContractFilter({
                offset: 100,
                interfaceIds: ['interface1'],
            })

            const identifierFilter =
                filter.eventFormat.filtersForAnyParty?.cumulative?.[0]
                    ?.identifierFilter

            expect(identifierFilter).toBeDefined()
            if (identifierFilter && 'InterfaceFilter' in identifierFilter) {
                expect(identifierFilter.InterfaceFilter.value.interfaceId).toBe(
                    'interface1'
                )
                expect(
                    identifierFilter.InterfaceFilter.value
                        .includeCreatedEventBlob
                ).toBe(true)
                expect(
                    identifierFilter.InterfaceFilter.value.includeInterfaceView
                ).toBe(true)
            } else {
                throw new Error('Expected InterfaceFilter in identifierFilter')
            }
        })

        it('should handle offset 0', () => {
            const filter = buildActiveContractFilter({
                offset: 0,
                templateIds: ['template1'],
            })

            expect(filter.activeAtOffset).toBe(0)
        })

        it('should set activeAtOffset correctly', () => {
            const filter = buildActiveContractFilter({
                offset: 12345,
                parties: ['party1'],
                filterByParty: true,
            })

            expect(filter.activeAtOffset).toBe(12345)
        })
    })
})
