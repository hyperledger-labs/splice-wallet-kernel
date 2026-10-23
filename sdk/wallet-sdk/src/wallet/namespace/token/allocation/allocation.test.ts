// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, vi, beforeEach, expect } from 'vitest'
import * as mock from '../../../__tests__/mocks'
import type { TokenNamespaceConfig } from '../index'
import { ParsedURL } from '../../utils/url'
import { AllocationNamespace } from './service'
import type {
    AllocationContextParams,
    AllocationInstructionCreateParams,
} from './types'
import {
    ALLOCATION_INTERFACE_ID,
    ALLOCATION_REQUEST_INTERFACE_ID,
} from '@canton-network/core-token-standard'
/* oxlint-disable typescript/no-explicit-any */

const { ctx, mockLogger } = mock

const mockTokenStandard = {
    listContractsByInterface: vi.fn(),
    allocation: {
        createExecuteTransferAllocation: vi.fn(),
        createWithdrawAllocation: vi.fn(),
        createCancelAllocation: vi.fn(),
        createAllocationInstruction: vi.fn(),
        createWithdrawAllocationInstruction: vi.fn(),
        createRejectAllocationRequest: vi.fn(),
        createWithdrawAllocationRequest: vi.fn(),
        fetchExecuteTransferChoiceContext: vi.fn(),
        fetchWithdrawAllocationChoiceContext: vi.fn(),
        fetchCancelAllocationChoiceContext: vi.fn(),
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

const asset = {
    id: 'Amulet',
    displayName: 'Amulet',
    symbol: 'CC',
    registryUrl: new URL('http://registry.com'),
    admin: 'adminParty:123',
    capabilities: mock.capabilities,
}

describe('allocation namespace namespace', () => {
    let allocation: AllocationNamespace

    const defaultAllocationParams = {
        allocationCid: 'cid1',
        asset: asset,
        choiceContext: {
            choiceContextData: { someContext: 'data' },
            disclosedConctracts: ['mock-contract' as any],
        },
    }

    const mockServiceResponse = [
        { ExerciseCommand: { choice: 'MockedChoice', contractId: 'cid1' } },
        ['mock-contract'],
    ]

    beforeEach(() => {
        allocation = new AllocationNamespace(config)
    })

    it('should create allocation execute transfer', async () => {
        const spy = mockTokenStandard.allocation.createExecuteTransferAllocation
        spy.mockResolvedValue(mockServiceResponse)

        const result = await allocation.execute(defaultAllocationParams)

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

    it('should create withdraw allocation', async () => {
        const spy = mockTokenStandard.allocation.createWithdrawAllocation
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

    it('should create cancel allocation transfer', async () => {
        const spy = mockTokenStandard.allocation.createCancelAllocation
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

    describe('allocation instruction', () => {
        const defaultAllocationInstructionParams: AllocationInstructionCreateParams =
            {
                allocationSpecification: {
                    settlement: {
                        executor:
                            'v1-04-venue::1220b134f7b8fcfcc5a266fc22b3a1589e2668b46ae5e79f962e40253ef4cfcca4ce',
                        settlementRef: {
                            id: 'OTCTradeProposal',
                            cid: null,
                        },
                        requestedAt: '2026-06-17T14:58:42.272096Z',
                        allocateBefore: '2026-06-17T15:58:42.268Z',
                        settleBefore: '2026-06-17T16:58:42.268Z',
                        meta: {
                            values: {},
                        },
                    },
                    transferLegId: 'leg1',
                    transferLeg: {
                        sender: 'v1-04-bob::122070342ed30dbb9e4d5b2f393b72b406af99fc7f857681597b661bf630ae6c3f66',
                        receiver:
                            'v1-04-alice::1220cea6ed5e173a9af97324415fda0287d71f1a2038cf94499b08c881a2974639a2',
                        amount: '20.0000000000',
                        instrumentId: {
                            admin: 'DSO::1220d78a7ceb55b7e033856f64b9bab6c90792dcaec3d23b35bf71a87562737168fa',
                            id: 'Amulet',
                        },
                        meta: {
                            values: {},
                        },
                    },
                },
                asset: asset,
            }

        const mockServiceResponse = [
            { ExerciseCommand: { choice: 'MockedChoice', contractId: 'cid1' } },
            ['mock-contract'],
        ]

        it('should create alloacation instruction', async () => {
            const spy = mockTokenStandard.allocation.createAllocationInstruction
            spy.mockResolvedValue(mockServiceResponse)

            await allocation.instruction.create(
                defaultAllocationInstructionParams
            )
            expect(spy).toHaveBeenCalledExactlyOnceWith(
                defaultAllocationInstructionParams.allocationSpecification,
                defaultAllocationInstructionParams.asset.admin,
                defaultAllocationInstructionParams.asset.registryUrl,
                undefined,
                undefined,
                undefined
            )
        })

        it('should create alloacation withdraw instruction', async () => {
            const spy =
                mockTokenStandard.allocation.createWithdrawAllocationInstruction
            spy.mockResolvedValue(mockServiceResponse)

            await allocation.instruction.withdraw('allocation-cid')
            expect(spy).toHaveBeenCalledExactlyOnceWith('allocation-cid')
        })
    })

    describe('allocation request', () => {
        it('should create reject request', async () => {
            const spy =
                mockTokenStandard.allocation.createRejectAllocationRequest
            spy.mockResolvedValue(mockServiceResponse)
            await allocation.request.reject('cid', 'alice::abc')
            expect(spy).toHaveBeenCalledExactlyOnceWith('cid', 'alice::abc')
        })

        it('should create withdraw request', async () => {
            const spy =
                mockTokenStandard.allocation.createWithdrawAllocationRequest
            spy.mockResolvedValue(mockServiceResponse)
            await allocation.request.withdraw('cid')
            expect(spy).toHaveBeenCalledExactlyOnceWith('cid')
        })

        it('should list pending', async () => {
            const pendingResponse = [
                {
                    contractId: 'cid',
                    interfaceViewValue: '',
                    activeContract: 'contract',
                    fetchedAtOffset: 10,
                },
            ]

            const spy = mockTokenStandard.listContractsByInterface
            spy.mockResolvedValue(pendingResponse)
            await allocation.request.pending('alice::abc')

            expect(spy).toHaveBeenCalledExactlyOnceWith(
                ALLOCATION_REQUEST_INTERFACE_ID,
                'alice::abc'
            )
        })
    })

    describe('scanning allocations by transfer leg', () => {
        const allocationForLeg = (transferLegId: string, contractId: string) =>
            ({
                contractId,
                interfaceViewValue: { allocation: { transferLegId } },
                activeContract: 'contract',
                fetchedAtOffset: 10,
            }) as any

        it('should return each requested leg once all are visible', async () => {
            const spy = mockTokenStandard.listContractsByInterface
            spy.mockResolvedValue([
                allocationForLeg('leg-0', 'amulet-cid'),
                allocationForLeg('leg-1', 'test-token-cid'),
            ])

            const result = await allocation.scan({
                partyId: 'venue::abc',
                transferLegIds: ['leg-0', 'leg-1'],
            })

            expect(spy).toHaveBeenCalledExactlyOnceWith(
                ALLOCATION_INTERFACE_ID,
                'venue::abc'
            )
            expect(result['leg-0'].contractId).toBe('amulet-cid')
            expect(result['leg-1'].contractId).toBe('test-token-cid')
        })

        it('should poll until a lagging allocation propagates', async () => {
            const spy = mockTokenStandard.listContractsByInterface
            spy.mockResolvedValueOnce([
                allocationForLeg('leg-0', 'amulet-cid'),
            ]).mockResolvedValueOnce([
                allocationForLeg('leg-0', 'amulet-cid'),
                allocationForLeg('leg-1', 'test-token-cid'),
            ])

            const result = await allocation.scan({
                partyId: 'venue::abc',
                transferLegIds: ['leg-0', 'leg-1'],
                retryIntervalMs: 0,
            })

            expect(spy).toHaveBeenCalledTimes(2)
            expect(result['leg-1'].contractId).toBe('test-token-cid')
        })

        it('should throw when a leg never propagates within maxAttempts', async () => {
            const spy = mockTokenStandard.listContractsByInterface
            spy.mockResolvedValue([allocationForLeg('leg-0', 'amulet-cid')])

            await expect(
                allocation.scan({
                    partyId: 'venue::abc',
                    transferLegIds: ['leg-0', 'leg-1'],
                    maxAttempts: 2,
                    retryIntervalMs: 0,
                })
            ).rejects.toThrow(/did not propagate/)

            expect(spy).toHaveBeenCalledTimes(2)
        })
    })

    describe('fetching allocation context', () => {
        const resp = {
            choiceContextData: {
                values: {
                    'expire-lock': {
                        tag: 'AV_Bool',
                        value: true,
                    },
                    'open-round': {
                        tag: 'AV_ContractId',
                        value: '00800cdd9f4e7e3127d58a0d94f0f3c6cabdd144f5980d335196bb01a3261a6202ca12122037b179babe05c9868a9e863ddb590eef73af2a6396678f4e60e7dbb27c46c992',
                    },
                    'external-party-config-state': {
                        tag: 'AV_ContractId',
                        value: '0061707cca8147bd9ed6c173793682d194d86311fbf40cc9a7bb45a87023a32cfaca1212202837be3aba61b61a90f10309f5811dfaa442d9e9c6fefd8f97a79478ed2f5baf',
                    },
                    'amulet-rules': {
                        tag: 'AV_ContractId',
                        value: '00cc8b8455b3ae15a2847332109767b4f56406f757b0cbf3c73b9c9a0fad6fddaeca121220ab51477dd1d02ae13cee8f2018777c348d9c44d32c9d6a7c10cf3a63c49172b9',
                    },
                },
            },
            disclosedContracts: ['mock-contract' as any],
        }
        const defaultAllocationContextParams: AllocationContextParams = {
            allocationCid: 'cid-1',
            registryUrl: 'http://registry.com',
        }
        const expectedTokenStandardParamsUrl = new ParsedURL(
            ctx,
            defaultAllocationContextParams.registryUrl
        )
        it('should fetch execute transfer context', async () => {
            const spy =
                mockTokenStandard.allocation.fetchExecuteTransferChoiceContext
            spy.mockResolvedValue(resp)
            await allocation.context.execute(defaultAllocationContextParams)
            expect(spy).toHaveBeenCalledExactlyOnceWith(
                defaultAllocationContextParams.allocationCid,
                expectedTokenStandardParamsUrl
            )
        })

        it('should fetch withdraw allocation choicecontext', async () => {
            const spy =
                mockTokenStandard.allocation
                    .fetchWithdrawAllocationChoiceContext
            spy.mockResolvedValue(resp)
            await allocation.context.withdraw(defaultAllocationContextParams)
            expect(spy).toHaveBeenCalledExactlyOnceWith(
                defaultAllocationContextParams.allocationCid,
                expectedTokenStandardParamsUrl
            )
        })

        it('should fetch cancel allocation choicecontext', async () => {
            const spy =
                mockTokenStandard.allocation.fetchCancelAllocationChoiceContext
            spy.mockResolvedValue(resp)
            await allocation.context.cancel(defaultAllocationContextParams)
            expect(spy).toHaveBeenCalledExactlyOnceWith(
                defaultAllocationContextParams.allocationCid,
                expectedTokenStandardParamsUrl
            )
        })
    })
})
