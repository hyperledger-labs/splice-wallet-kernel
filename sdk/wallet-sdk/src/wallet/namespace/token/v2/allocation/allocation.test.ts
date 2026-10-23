// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    describe,
    it,
    vi,
    beforeEach,
    expect,
    type MockedFunction,
} from 'vitest'
import type { AssetBody } from '@canton-network/core-token-standard-service'
import * as mock from '../../../../__tests__/mocks'
import type { TokenNamespaceConfig } from '../../index'
import { ParsedURL } from '../../../utils/url'
import { AllocationNamespace } from './namespace'
import {
    ALLOCATION_INSTRUCTION_INTERFACE_ID_V2,
    ALLOCATION_REQUEST_INTERFACE_ID_V2,
} from '@canton-network/core-token-standard-v2'

/* oxlint-disable typescript/no-explicit-any */

vi.mock('./types', async (importActual) => {
    const actual = await importActual<typeof import('./types')>()
    return {
        ...actual,
        actorsFor: vi.fn(),
    }
})

import { actorsFor, type AllocationChoiceParams } from './types'

const { ctx, mockLogger } = mock

const mockTokenStandard = {
    listContractsByInterface: vi.fn(),
    registriesToAssets: vi.fn(),
    v2: {
        allocation: {
            createAllocationChoice: vi.fn(),
            fetchAllocationChoiceContext: vi.fn(),
            createAllocation: vi.fn(),
            createWithdrawAllocationInstruction: vi.fn(),
            createAcceptAllocationInstruction: vi.fn(),
            createAllocationsForRequest: vi.fn(),
            createAllocationRequestChoice: vi.fn(),
            fetchSettlementFactory: vi.fn(),
        },
    },
}

const config: TokenNamespaceConfig = {
    commonCtx: {
        ...ctx,
        defaultSynchronizerId: 'mock-synchronizer-id',
        logger: mockLogger,
    } as any,
    registryUrls: [new ParsedURL(ctx, 'http://registry.com')],
    tokenStandardService: mockTokenStandard as unknown as any,
    validatorParty: 'validatorParty::123',
}

const asset: AssetBody = {
    id: 'Amulet',
    displayName: 'Amulet',
    symbol: 'CC',
    registryUrl: new URL('http://registry.com'),
    admin: 'adminParty:123',
    capabilities: {
        allocation: ['v1', 'v2'],
        allocationInstruction: ['v1', 'v2'],
        allocationRequest: ['v1', 'v2'],
        holding: ['v1'],
        transferInstruction: ['v1', 'v2'],
    },
}

describe('allocation namespace', () => {
    let allocation: AllocationNamespace

    const defaultAllocationParams: AllocationChoiceParams = {
        allocationCid: 'cid1',
        asset: asset,
        actors: ['alice::abc'],
        prefetchedRegistryChoiceContext: {
            choiceContextData: {},
            disclosedContracts: [],
        },
    }

    const mockServiceResponse = [
        { ExerciseCommand: { choice: 'MockedChoice', contractId: 'cid1' } },
        ['mock-contract'],
    ]

    beforeEach(() => {
        vi.clearAllMocks()
        allocation = new AllocationNamespace(config)
    })

    it('should create withdraw allocation', async () => {
        const spy = mockTokenStandard.v2.allocation.createAllocationChoice
        spy.mockResolvedValue(mockServiceResponse)

        const result = await allocation.withdraw(defaultAllocationParams)

        expect(spy).toHaveBeenCalledTimes(1)

        expect(result).toStrictEqual([
            {
                ExerciseCommand: {
                    ExerciseCommand: {
                        choice: 'MockedChoice',
                        contractId: 'cid1',
                    },
                },
            },
            ['mock-contract'],
        ])
    })

    it('should create cancel allocation', async () => {
        const spy = mockTokenStandard.v2.allocation.createAllocationChoice
        spy.mockResolvedValue(mockServiceResponse)

        const result = await allocation.cancel(defaultAllocationParams)

        expect(spy).toHaveBeenCalledTimes(1)

        expect(result).toStrictEqual([
            {
                ExerciseCommand: {
                    ExerciseCommand: {
                        choice: 'MockedChoice',
                        contractId: 'cid1',
                    },
                },
            },
            ['mock-contract'],
        ])
    })

    it('waits for the receiver side when only the sender side is visible', async () => {
        vi.useFakeTimers()
        try {
            const settlement = { id: 'settle-1', cid: null }
            const senderAllocation = {
                contractId: 'sender-allocation',
                interfaceViewValue: {
                    settlement,
                    allocation: {
                        transferLegSides: [
                            { transferLegId: 'leg-1', side: 'SenderSide' },
                        ],
                    },
                },
            }
            const receiverAllocation = {
                contractId: 'receiver-allocation',
                interfaceViewValue: {
                    settlement,
                    allocation: {
                        transferLegSides: [
                            { transferLegId: 'leg-1', side: 'ReceiverSide' },
                        ],
                    },
                },
            }
            const listContracts = mockTokenStandard.listContractsByInterface
            listContracts
                .mockResolvedValueOnce([senderAllocation])
                .mockResolvedValueOnce([senderAllocation, receiverAllocation])

            const result = allocation.scan({
                partyId: 'executor::123',
                settlement,
                transferLegIds: ['leg-1'],
                maxAttempts: 2,
                retryIntervalMs: 1000,
            })

            await vi.advanceTimersByTimeAsync(1000)
            await expect(result).resolves.toStrictEqual([
                senderAllocation,
                receiverAllocation,
            ])
            expect(listContracts).toHaveBeenCalledTimes(2)
        } finally {
            vi.clearAllTimers()
            vi.useRealTimers()
        }
    })

    describe('context', () => {
        const params = {
            allocationCid: 'cid-1',
            registryUrl: 'http://registry.com',
        }
        const expectedUrl = new ParsedURL(ctx, params.registryUrl)

        it('fetches and returns the withdraw choice context', async () => {
            const spy =
                mockTokenStandard.v2.allocation.fetchAllocationChoiceContext
            const ctxResponse = {
                choiceContextData: { values: {} },
                disclosedContracts: [],
            }
            spy.mockResolvedValue(ctxResponse)

            const result = await allocation.context.withdraw(params)

            expect(spy).toHaveBeenCalledExactlyOnceWith(
                'withdraw',
                'cid-1',
                expectedUrl
            )
            expect(result).toBe(ctxResponse)
        })

        it('fetches and returns the cancel choice context', async () => {
            const spy =
                mockTokenStandard.v2.allocation.fetchAllocationChoiceContext
            const ctxResponse = {
                choiceContextData: { values: {} },
                disclosedContracts: [],
            }
            spy.mockResolvedValue(ctxResponse)

            const result = await allocation.context.cancel(params)

            expect(spy).toHaveBeenCalledExactlyOnceWith(
                'cancel',
                'cid-1',
                expectedUrl
            )
            expect(result).toBe(ctxResponse)
        })
    })

    describe('instruction', () => {
        it('should list pending allocation instructions', async () => {
            const pendingResponse = [
                {
                    contractId: 'cid',
                    interfaceViewValue: {},
                    activeContract: {},
                    fetchedAtOffset: 10,
                },
            ]
            const spy = mockTokenStandard.listContractsByInterface
            spy.mockResolvedValue(pendingResponse)

            const result = await allocation.instruction.pending('alice::abc')

            expect(spy).toHaveBeenCalledExactlyOnceWith(
                ALLOCATION_INSTRUCTION_INTERFACE_ID_V2,
                'alice::abc'
            )
            expect(result).toBe(pendingResponse)
        })

        describe('create', () => {
            const createParams = {
                allocationSpecification: {
                    admin: asset.admin,
                    authorizer: {
                        owner: 'alice::owner',
                        provider: null,
                        id: '',
                    },
                    transferLegSides: [],
                    settlementDeadline: null,
                    nextIterationFunding: {},
                    committed: false,
                    meta: { values: {} },
                },
                settlement: {
                    executors: [],
                    id: 'settle-1',
                    cid: null,
                    meta: { values: {} },
                },
                actors: ['alice::owner'],
                asset,
            } as any

            it('throws when the spec admin does not match the asset admin', async () => {
                const params = {
                    ...createParams,
                    allocationSpecification: {
                        ...createParams.allocationSpecification,
                        admin: 'mismatched-admin::999',
                    },
                }

                await expect(
                    allocation.instruction.create(params)
                ).rejects.toThrow(
                    `Spec admin mismatched-admin::999 does not match asset admin from registry ${asset.admin}`
                )
                expect(
                    mockTokenStandard.v2.allocation.createAllocation
                ).not.toHaveBeenCalled()
            })

            it('should create allocation instruction', async () => {
                const spy = mockTokenStandard.v2.allocation.createAllocation
                spy.mockResolvedValue(mockServiceResponse)

                const result = await allocation.instruction.create(createParams)

                expect(spy).toHaveBeenCalledExactlyOnceWith(
                    {
                        settlement: createParams.settlement,
                        spec: createParams.allocationSpecification,
                        admin: createParams.allocationSpecification.admin,
                        actors: createParams.actors,
                        inputUtxos: [],
                        requestedAt: undefined,
                    },
                    asset.registryUrl,
                    undefined
                )
                expect(result).toStrictEqual([
                    { ExerciseCommand: mockServiceResponse[0] },
                    ['mock-contract'],
                ])
            })

            it('passes through inputUtxos and requestedAt when provided', async () => {
                const spy = mockTokenStandard.v2.allocation.createAllocation
                spy.mockResolvedValue(mockServiceResponse)

                await allocation.instruction.create({
                    ...createParams,
                    inputUtxos: ['utxo-1'],
                    requestedAt: '2026-01-01T00:00:00.000Z',
                })

                expect(spy).toHaveBeenCalledWith(
                    expect.objectContaining({
                        inputUtxos: ['utxo-1'],
                        requestedAt: '2026-01-01T00:00:00.000Z',
                    }),
                    asset.registryUrl,
                    undefined
                )
            })

            it('logs and rethrows when the service call fails', async () => {
                const error = new Error('registry unreachable')
                mockTokenStandard.v2.allocation.createAllocation.mockRejectedValue(
                    error
                )

                await expect(
                    allocation.instruction.create(createParams)
                ).rejects.toThrow('registry unreachable')

                expect(mockLogger.error).toHaveBeenCalledWith(
                    { error, params: createParams },
                    'Failed to create v2 allocation instruction'
                )
            })
        })

        it('should create withdraw allocation instruction', async () => {
            const spy =
                mockTokenStandard.v2.allocation
                    .createWithdrawAllocationInstruction
            spy.mockReturnValue(mockServiceResponse)

            const result = await allocation.instruction.withdraw('cid1', [
                'alice::abc',
            ])

            expect(spy).toHaveBeenCalledExactlyOnceWith('cid1', ['alice::abc'])
            expect(result).toStrictEqual([
                { ExerciseCommand: mockServiceResponse[0] },
                ['mock-contract'],
            ])
        })

        it('should create accept allocation instruction', async () => {
            const spy =
                mockTokenStandard.v2.allocation
                    .createAcceptAllocationInstruction
            spy.mockReturnValue(mockServiceResponse)

            const result = await allocation.instruction.accept('cid1', [
                'alice::abc',
            ])

            expect(spy).toHaveBeenCalledExactlyOnceWith('cid1', ['alice::abc'])
            expect(result).toStrictEqual([
                { ExerciseCommand: mockServiceResponse[0] },
                ['mock-contract'],
            ])
        })
    })

    describe('request', () => {
        const requestContract = {
            contractId: 'request-cid',
            interfaceViewValue: {
                originalRequestCid: null,
                settlement: {
                    executors: ['executor::1'],
                    id: 'settle-1',
                    cid: null,
                    meta: { values: {} },
                },
                allocations: [],
                requestedAt: '2026-01-01T00:00:00.000Z',
                settleAt: null,
                availableActions: undefined,
                meta: { values: {} },
            },
            activeContract: {},
            fetchedAtOffset: 1,
        } as any

        it('should list pending allocation requests', async () => {
            const pendingResponse = [
                {
                    contractId: 'cid',
                    interfaceViewValue: {},
                    activeContract: {},
                    fetchedAtOffset: 10,
                },
            ]
            const spy = mockTokenStandard.listContractsByInterface
            spy.mockResolvedValue(pendingResponse)

            const result = await allocation.request.pending('alice::abc')

            expect(spy).toHaveBeenCalledExactlyOnceWith(
                ALLOCATION_REQUEST_INTERFACE_ID_V2,
                'alice::abc'
            )
            expect(result).toBe(pendingResponse)
        })

        describe('accept', () => {
            it('should create allocations for request using explicit actors', async () => {
                mockTokenStandard.registriesToAssets.mockResolvedValue([asset])
                const spy =
                    mockTokenStandard.v2.allocation.createAllocationsForRequest
                spy.mockResolvedValue([
                    [
                        {
                            choice: 'AllocationFactory_Allocate',
                            contractId: 'c1',
                        },
                        {
                            choice: 'AllocationRequest_Accept',
                            contractId: 'request-cid',
                        },
                    ],
                    ['mock-contract'],
                ])

                const [commands, dc] = await allocation.request.accept({
                    request: requestContract,
                    actors: ['alice::abc'],
                    partyId: 'alice::abc',
                } as any)

                expect(actorsFor).not.toHaveBeenCalled()
                expect(spy).toHaveBeenCalledExactlyOnceWith(
                    expect.objectContaining({
                        requestCid: 'request-cid',
                        request: requestContract.interfaceViewValue,
                        actors: ['alice::abc'],
                        registry: expect.any(Function),
                    })
                )
                expect(commands).toStrictEqual([
                    {
                        ExerciseCommand: {
                            choice: 'AllocationFactory_Allocate',
                            contractId: 'c1',
                        },
                    },
                    {
                        ExerciseCommand: {
                            choice: 'AllocationRequest_Accept',
                            contractId: 'request-cid',
                        },
                    },
                ])
                expect(dc).toStrictEqual(['mock-contract'])
            })

            it('derives actors via actorsFor when none are given, and throws if none are found', async () => {
                ;(
                    actorsFor as MockedFunction<typeof actorsFor>
                ).mockReturnValue(undefined)

                await expect(
                    allocation.request.accept({
                        request: requestContract,
                        partyId: 'alice::abc',
                    } as any)
                ).rejects.toThrow(
                    'alice::abc cannot accept allocation request request-cid'
                )

                expect(actorsFor).toHaveBeenCalledWith(
                    requestContract.interfaceViewValue.availableActions,
                    'ARA_Accept',
                    'alice::abc'
                )
                expect(
                    mockTokenStandard.v2.allocation.createAllocationsForRequest
                ).not.toHaveBeenCalled()
            })

            it('throws from registryForAdmin when no configured registry serves the admin', async () => {
                mockTokenStandard.registriesToAssets.mockResolvedValue([])
                mockTokenStandard.v2.allocation.createAllocationsForRequest.mockImplementation(
                    async ({ registry }: any) => {
                        await registry('unknown-admin::999')
                        return [[], []]
                    }
                )

                await expect(
                    allocation.request.accept({
                        request: requestContract,
                        actors: ['alice::abc'],
                        partyId: 'alice::abc',
                    } as any)
                ).rejects.toThrow(
                    'No configured registry serves instrument admin unknown-admin::999'
                )
            })
        })

        describe('reject', () => {
            it('uses explicit actors when provided', async () => {
                const spy =
                    mockTokenStandard.v2.allocation
                        .createAllocationRequestChoice
                spy.mockReturnValue(mockServiceResponse)

                const result = await allocation.request.reject({
                    request: requestContract,
                    actors: ['explicit::actor'],
                    partyId: 'alice::abc',
                } as any)

                expect(spy).toHaveBeenCalledExactlyOnceWith(
                    'reject',
                    'request-cid',
                    ['explicit::actor']
                )
                expect(result).toStrictEqual([
                    { ExerciseCommand: mockServiceResponse[0] },
                    ['mock-contract'],
                ])
            })

            it('falls back to settlement executors when no actors are given', async () => {
                const spy =
                    mockTokenStandard.v2.allocation
                        .createAllocationRequestChoice
                spy.mockReturnValue(mockServiceResponse)

                await allocation.request.reject({
                    request: requestContract,
                    partyId: 'alice::abc',
                } as any)

                expect(spy).toHaveBeenCalledWith('reject', 'request-cid', [
                    'executor::1',
                ])
            })

            it('throws when neither actors nor settlement executors are available', async () => {
                const noExecutorsRequest = {
                    ...requestContract,
                    interfaceViewValue: {
                        ...requestContract.interfaceViewValue,
                        settlement: {
                            ...requestContract.interfaceViewValue.settlement,
                            executors: undefined,
                        },
                    },
                }

                await expect(
                    allocation.request.reject({
                        request: noExecutorsRequest,
                        partyId: 'alice::abc',
                    } as any)
                ).rejects.toThrow(
                    'alice::abc cannot accept allocation request request-cid'
                )
            })
        })

        describe('withdraw', () => {
            it('uses explicit actors when provided', async () => {
                const spy =
                    mockTokenStandard.v2.allocation
                        .createAllocationRequestChoice
                spy.mockReturnValue(mockServiceResponse)

                const result = await allocation.request.withdraw({
                    request: requestContract,
                    actors: ['explicit::actor'],
                } as any)

                expect(spy).toHaveBeenCalledExactlyOnceWith(
                    'withdraw',
                    'request-cid',
                    ['explicit::actor']
                )
                expect(result).toStrictEqual([
                    { ExerciseCommand: mockServiceResponse[0] },
                    ['mock-contract'],
                ])
            })

            it('falls back to settlement executors when no actors are given', async () => {
                const spy =
                    mockTokenStandard.v2.allocation
                        .createAllocationRequestChoice
                spy.mockReturnValue(mockServiceResponse)

                await allocation.request.withdraw({
                    request: requestContract,
                } as any)

                expect(spy).toHaveBeenCalledWith('withdraw', 'request-cid', [
                    'executor::1',
                ])
            })
        })
    })
})
