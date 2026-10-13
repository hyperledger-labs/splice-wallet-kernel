// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, type MockedObject } from 'vitest'
import { TokenStandardService } from './token-standard-service.js'
import { CoreService } from './core-service.js'
import type { PrettyContract } from '@canton-network/core-tx-parser'
import type { HoldingView } from '@canton-network/core-token-standard'
import { Decimal } from 'decimal.js'
import type { Logger } from '@canton-network/core-types'
import rawTransactions from './test-data/mock/txs.json'
import prettyTransactions from './test-data/expected/txs.json'

/* eslint-disable @typescript-eslint/no-explicit-any */
const { mockAcsState, mockParseTransaction } = vi.hoisted(() => ({
    mockAcsState: vi.fn().mockResolvedValue([]),
    mockParseTransaction: vi.fn().mockResolvedValue({ offset: 10, events: [] }),
}))

vi.mock('@canton-network/core-tx-parser', async (importActual) => {
    const actual =
        await importActual<typeof import('@canton-network/core-tx-parser')>()
    return {
        ...actual,
        TransactionParser: vi.fn(function () {
            return { parseTransaction: mockParseTransaction }
        }),
    }
})

vi.mock('@canton-network/core-acs-reader', () => ({
    ACSReader: vi.fn(function () {
        return { raw: { read: mockAcsState } }
    }),
}))
const makeProvider = (overrides: Record<string, unknown> = {}) => ({
    request: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    ...overrides,
})

const accessTokenProvider = {
    getAccessToken: vi.fn().mockResolvedValue('test-token'),
    getAuthContext: vi.fn().mockResolvedValue(''),
}
const mockLogger: MockedObject<Logger> = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
} as MockedObject<Logger>

const makeTokenClient = () => ({ get: vi.fn(), post: vi.fn() })

function makeService(isMasterUser = false) {
    const provider = makeProvider()
    const service = new TokenStandardService(
        provider,
        mockLogger,
        accessTokenProvider,
        isMasterUser
    )

    const tokenClient = makeTokenClient()
    const getTokenStandardClient = vi
        .spyOn(service.core, 'getTokenStandardClient')
        .mockReturnValue(tokenClient as any)

    return { service, getTokenStandardClient, provider, tokenClient }
}

const registryUrl = new URL('https://fake/registry')

const makeChoiceContext = (overrides = {}) => ({
    choiceContextData: { values: { ctx: 'data' } },
    disclosedContracts: [
        {
            contractId: 'disc1',
            templateId: 'tempalteId',
            createdEventBlob: 'blah',
            synchronizerId: 'mysync',
        },
    ],
    ...overrides,
})

const makeHolding = (
    id: string,
    amount: string,
    admin: string,
    instrumentId: string,
    lock?: { expiresAt?: string | null } | null
) => ({
    contractId: id,
    interfaceViewValue: {
        owner: 'dummy',
        instrumentId: {
            admin: admin,
            id: instrumentId,
        },
        lock: lock ?? null,
        meta: {
            values: {},
        },
        amount,
    },
    activeContract: {
        createdEvent: {
            offset: 1,
            nodeId: 1,
            contractId: id,
            templateId:
                'a31be0483f3175647053f28965a4e6d97e3dbc433ea2338be303fae69bbcff6a:Splice.Amulet:Amulet',
            contractKey: null,
            contractKeyHash: '',
            createdEventBlob: 'blob',
            createdAt: 'time',
            packageName: 'name',
        },
        synchronizerId: 'blah',
        reassignmentCounter: 0,
    },
})

const instrumentAdmin =
    'DSO::1220c69732dd5f3b434c283f61cbc29d3bb492c50c56e306b436c3e1741cbc7be53e'
const instrumentId = 'Amulet'

const senderParty =
    'v1-01-alice::12206eee60f64d90be3f823007d1321dc6acc5f4f2c57d3dd6ac1f66148753bb65c5'
describe('CoreService', () => {
    it('should getInputHoldingsCids when input utxos are provided', async () => {
        const { service } = makeService()
        vi.spyOn(service.core, 'listContractsByInterface').mockResolvedValue([])
        const result = await service.core.getInputHoldingsCids({
            sender: 'blah',
            inputUtxos: ['cid1', 'cid2'],
        })

        expect(result).toEqual(['cid1', 'cid2'])
    })

    it('should throw an error when sender has no holdings', async () => {
        const { service } = makeService()
        vi.spyOn(service.core, 'listContractsByInterface').mockResolvedValue([])

        await expect(
            service.core.getInputHoldingsCids({
                sender: 'blah',
            })
        ).rejects.toThrow(
            `Sender has no holdings, so transfer can't be executed.`
        )
    })

    it('should fetch only unlocked holdings', async () => {
        const lockedHolding = makeHolding('1', '20', 'admin:123', 'amulet', {
            expiresAt: null,
        }) as any
        const unlockedHolding = makeHolding('2', '20', 'admin:123', 'amulet')
        const { service } = makeService()
        vi.spyOn(service.core, 'listContractsByInterface').mockResolvedValue([
            lockedHolding,
            unlockedHolding,
        ])

        const result = await service.core.getInputHoldingsCids({
            sender: senderParty,
        })
        expect(result).toHaveLength(1)
        expect(result[0]).toEqual('2')
    })
})

describe('AllocationService', () => {
    const baseSpec = {
        transferLeg: {
            sender: senderParty,
            receiver: 'bob::def',
            amount: '10.0',
            instrumentId: { admin: instrumentAdmin, id: instrumentId },
            meta: null,
        },
        settlement: { meta: null },
    }

    it('uses prefetched context and does not make a registry call for allocation instruction', async () => {
        const { service, tokenClient } = makeService()
        vi.spyOn(service.core, 'getInputHoldingsCids').mockResolvedValue([
            'cid1',
            'cid2',
        ])
        const ctx = makeChoiceContext()
        await service.allocation.createAllocationInstruction(
            baseSpec as any,
            instrumentAdmin,
            registryUrl,
            [],
            undefined,
            { factoryId: 'factory-id', choiceContext: ctx as any }
        )

        expect(tokenClient.post).not.toHaveBeenCalled()
    })

    it('makes a registry call when no prefetched context is provided allocation instruction', async () => {
        const { service, tokenClient } = makeService()
        vi.spyOn(service.core, 'getInputHoldingsCids').mockResolvedValue([
            'cid1',
            'cid2',
        ])

        const ctx = makeChoiceContext()
        tokenClient.post.mockResolvedValue({
            factoryId: 'factory-id',
            choiceContext: ctx as any,
        })
        await service.allocation.createAllocationInstruction(
            baseSpec as any,
            instrumentAdmin,
            registryUrl
        )

        expect(tokenClient.post).toHaveBeenCalled()
    })

    it('uses prefetched context and does not make a registry call for create exectuion transfer allocation', async () => {
        const { service, tokenClient } = makeService()

        const ctx = makeChoiceContext()
        const [exercise] =
            await service.allocation.createExecuteTransferAllocation(
                'allocation-cid',
                registryUrl,
                ctx as any
            )
        expect(tokenClient.post).not.toHaveBeenCalled()
        expect(exercise.choice).toBe('Allocation_ExecuteTransfer')
        expect(exercise.contractId).toBe('allocation-cid')
    })

    it('does not use prefetched context and makes a registry call for create exectuion transfer allocation', async () => {
        const { service, tokenClient } = makeService()

        const ctx = makeChoiceContext()
        tokenClient.post.mockResolvedValue(ctx as any)
        await service.allocation.createExecuteTransferAllocation(
            'allocation-cid',
            registryUrl
        )
        expect(tokenClient.post).toHaveBeenCalled()
    })

    it('uses prefetched context and does not make a registry call for create withdraw allocation', async () => {
        const { service, tokenClient } = makeService()

        const ctx = makeChoiceContext()
        const [exercise] = await service.allocation.createWithdrawAllocation(
            'allocation-cid',
            registryUrl,
            ctx as any
        )
        expect(tokenClient.post).not.toHaveBeenCalled()
        expect(exercise.choice).toBe('Allocation_Withdraw')
    })

    it('does not use prefetched context and makes a registry call for  create withdraw allocation', async () => {
        const { service, tokenClient } = makeService()

        const ctx = makeChoiceContext()
        tokenClient.post.mockResolvedValue(ctx as any)
        await service.allocation.createWithdrawAllocation(
            'allocation-cid',
            registryUrl
        )
        expect(tokenClient.post).toHaveBeenCalled()
    })

    it('uses prefetched context and does not make a registry call for cancel allocation exercise', async () => {
        const { service, tokenClient } = makeService()

        const ctx = makeChoiceContext()
        const [exercise] = await service.allocation.createCancelAllocation(
            'allocation-cid',
            registryUrl,
            ctx as any
        )
        expect(tokenClient.post).not.toHaveBeenCalled()
        expect(exercise.choice).toBe('Allocation_Cancel')
    })

    it('does not use prefetched context and makes a registry call for  create cancel allocation', async () => {
        const { service, tokenClient } = makeService()

        const ctx = makeChoiceContext()
        tokenClient.post.mockResolvedValue(ctx as any)
        await service.allocation.createCancelAllocation(
            'allocation-cid',
            registryUrl
        )
        expect(tokenClient.post).toHaveBeenCalled()
    })

    it('command builders work', async () => {
        const { service } = makeService()
        const [exercise, dc] =
            await service.allocation.createWithdrawAllocationInstruction(
                'allocation-id'
            )
        expect(exercise.choice).toBe('AllocationInstruction_Withdraw')
        expect(exercise.contractId).toBe('allocation-id')
        expect(dc).toEqual([])

        const updateInstruction =
            await service.allocation.createUpdateAllocationInstruction(
                'allocation-id',
                ['actor::123'],
                { myCtx: 'val' },
                { meta: 'val' }
            )
        expect(updateInstruction[0].choice).toBe('AllocationInstruction_Update')
        expect(updateInstruction[0].choiceArgument).toStrictEqual({
            extraActors: ['actor::123'],
            extraArgs: {
                context: {
                    values: {
                        myCtx: 'val',
                    },
                },
                meta: {
                    values: {
                        meta: 'val',
                    },
                },
            },
        })

        const rejectReq =
            await service.allocation.createRejectAllocationRequest(
                'id1',
                senderParty
            )
        expect(rejectReq[0].choice).toBe('AllocationRequest_Reject')
        expect(rejectReq[0].choiceArgument).toStrictEqual({
            actor: 'v1-01-alice::12206eee60f64d90be3f823007d1321dc6acc5f4f2c57d3dd6ac1f66148753bb65c5',
            extraArgs: {
                context: {
                    values: {},
                },
                meta: {
                    values: {},
                },
            },
        })

        const withdraw =
            await service.allocation.createWithdrawAllocationRequest('id1')
        expect(withdraw[0].choice).toBe('AllocationRequest_Withdraw')
    })

    describe('buildAllocationFactoryChoiceArgs', () => {
        it('calls getInputHoldingCids and embeds resulting cids in the allocation factory choice args with the correct timestamp', async () => {
            const { service } = makeService()
            vi.spyOn(service.core, 'getInputHoldingsCids').mockResolvedValue([
                'cid1',
                'cid2',
            ])
            const ts = '2026-01-01T00:00:00.000Z'
            const result =
                await service.allocation.buildAllocationFactoryChoiceArgs(
                    baseSpec as any,
                    instrumentAdmin,
                    [],
                    ts
                )

            expect(result).toStrictEqual({
                allocation: {
                    settlement: {
                        meta: {
                            values: {},
                        },
                    },
                    transferLeg: {
                        amount: '10.0',
                        instrumentId: {
                            admin: 'DSO::1220c69732dd5f3b434c283f61cbc29d3bb492c50c56e306b436c3e1741cbc7be53e',
                            id: 'Amulet',
                        },
                        meta: {
                            values: {},
                        },
                        receiver: 'bob::def',
                        sender: 'v1-01-alice::12206eee60f64d90be3f823007d1321dc6acc5f4f2c57d3dd6ac1f66148753bb65c5',
                    },
                },
                expectedAdmin:
                    'DSO::1220c69732dd5f3b434c283f61cbc29d3bb492c50c56e306b436c3e1741cbc7be53e',
                extraArgs: {
                    context: {
                        values: {},
                    },
                    meta: {
                        values: {},
                    },
                },
                inputHoldingCids: ['cid1', 'cid2'],
                requestedAt: '2026-01-01T00:00:00.000Z',
            })
        })
    })

    describe('createAllocationInstructionFromContext', () => {
        const instrumentAdmin =
            'DSO::1220c69732dd5f3b434c283f61cbc29d3bb492c50c56e306b436c3e1741cbc7be53e'
        it('builds an AllocationFactory_Allocate exercise command for the given factory id and context', async () => {
            const { service } = makeService()
            const choiceArgs = {
                expectedAdmin: instrumentAdmin,
                allocation: {
                    settlement: {
                        executor: 'blah:123',
                        settlementRef: {
                            id: '123',
                            cid: 'cid123',
                        },
                        requestedAt: '',
                        allocateBefore: '',
                        settleBefore: '',
                        meta: { values: {} },
                    },
                    transferLegId: '',
                    transferLeg: {
                        sender: '',
                        receiver: '',
                        amount: '20.0',
                        instrumentId: 'Amulet',
                        meta: { values: {} },
                    },
                },
                requestedAt: '',
                inputHoldingCids: [],
                extraArgs: { context: { values: {} }, meta: { values: {} } },
            }

            const ctx = makeChoiceContext()
            const [exercise] =
                await service.allocation.createAllocationInstructionFromContext(
                    'factory-id',
                    choiceArgs as any,
                    ctx as any
                )

            expect(exercise.choice).toBe('AllocationFactory_Allocate')
            expect(exercise.contractId).toBe('factory-id')
        })
    })
})

describe('getInputHoldingsCidsForAmount', () => {
    it('returns exact match', async () => {
        const holdings = [
            makeHolding('a', '200', 'partyId', 'amulet'),
            makeHolding('b', '20', 'partyId', 'amulet'),
            makeHolding('c', '30', 'partyId', 'amulet'),
        ]

        const result = await CoreService.getInputHoldingsCidsForAmount(
            new Decimal(20),
            holdings
        )

        expect(result).toEqual(['b'])
    })

    it('returns multiple holdings to meet target amount', async () => {
        const holdings = [
            makeHolding('b', '20', 'partyId', 'amulet'),
            makeHolding('a', '200', 'partyId', 'amulet'),
            makeHolding('c', '30', 'partyId', 'amulet'),
        ]

        const result = await CoreService.getInputHoldingsCidsForAmount(
            new Decimal(220),
            holdings
        )

        expect(result).toEqual(['a', 'b'])
    })

    it('returns all holdings to meet target amount even if it exceeds the target', async () => {
        const holdings = [
            makeHolding('a', '2', 'partyId', 'amulet'),
            makeHolding('b', '99', 'partyId', 'amulet'),
            makeHolding('c', '3', 'partyId', 'amulet'),
        ]

        const result = await CoreService.getInputHoldingsCidsForAmount(
            new Decimal(100),
            holdings
        )

        expect(result).toEqual(['b', 'a'])
    })

    it('should filter out holdings by instrument', async () => {
        const holdings = [
            makeHolding('a', '2', 'instrumentAdmin1', 'amulet'),
            makeHolding('b', '99', 'instrumentAdmin1', 'amulet'),
            makeHolding('c', '3', 'instrumentAdmin2', 'usdcx'),
        ]

        const usdcxHoldings = await CoreService.filterHoldingsByInstrument({
            holdings,
            instrumentAdmin: 'instrumentAdmin2',
            instrumentId: 'usdcx',
        })

        const amuletHoldings = await CoreService.filterHoldingsByInstrument({
            holdings,
            instrumentAdmin: 'instrumentAdmin1',
            instrumentId: 'amulet',
        })

        expect(usdcxHoldings.length).toBe(1)
        expect(amuletHoldings.length).toBe(2)
    })

    it('throws an error if no unlocked holdings exist', async () => {
        const holdings: PrettyContract<HoldingView>[] = []

        await expect(
            CoreService.getInputHoldingsCidsForAmount(
                new Decimal(220),
                holdings
            )
        ).rejects.toThrow(`Sender doesn't have any unlocked holdings`)
    })

    it('throws an error if there are insufficient funds', async () => {
        const holdings = [
            makeHolding('a', '5', 'partyId', 'amulet'),
            makeHolding('b', '10', 'partyId', 'amulet'),
        ]

        await expect(
            CoreService.getInputHoldingsCidsForAmount(new Decimal(20), holdings)
        ).rejects.toThrow(
            `Sender doesn't have sufficient funds for this transfer. Missing amount: 5`
        )
    })

    it('throws an error if it exceeds 100 utxos', async () => {
        const holdings = Array.from({ length: 101 }, (_, i) =>
            makeHolding(`id${i}`, '1', 'partyId', 'amulet')
        )

        await expect(
            CoreService.getInputHoldingsCidsForAmount(
                new Decimal(101),
                holdings
            )
        ).rejects.toThrow(`Exceeded the maximum of 100 utxos in 1 transaction`)
    })
})

describe('TransferService', () => {
    it('builds transfer choice args', async () => {
        const { service } = makeService()
        vi.spyOn(service.core, 'getInputHoldingsCids').mockResolvedValue([
            'cid1',
        ])

        const res = await service.transfer.buildTransferChoiceArgs(
            senderParty,
            'bob::def',
            '50.0',
            instrumentAdmin,
            instrumentId
        )

        expect(res.transfer.sender).toBe(senderParty)
        expect(res.transfer.receiver).toBe('bob::def')
        expect(res.transfer.amount).toBe('50.0')
        expect(res.transfer.instrumentId).toEqual({
            admin: instrumentAdmin,
            id: instrumentId,
        })

        const expiry = new Date('2030-01-01T00:00:00Z')

        const resWithExpiry = await service.transfer.buildTransferChoiceArgs(
            senderParty,
            'bob::def',
            '50.0',
            instrumentAdmin,
            instrumentId,
            undefined,
            undefined,
            expiry
        )

        expect(resWithExpiry.transfer.executeBefore).toBe(expiry.toISOString())

        const resWithMemo = await service.transfer.buildTransferChoiceArgs(
            senderParty,
            'bob::def',
            '50.0',
            instrumentAdmin,
            instrumentId,
            undefined,
            'payment',
            expiry
        )
        expect(
            resWithMemo.transfer.meta.values[TokenStandardService.MEMO_KEY]
        ).toBe('payment')
    })

    it('creates transfer from context', async () => {
        const { service } = makeService()
        const choiceArgs = {
            expectedAdmin: instrumentAdmin,
            transfer: {
                sender: senderParty,
                receiver: 'bob',
                amount: '10.0',
                instrumentId: instrumentId,
            },
            extraArgs: { context: { values: {} }, meta: { values: {} } },
        }
        const ctx = makeChoiceContext()
        const [exercise, dc] = await service.transfer.createTransferFromContext(
            'id1',
            choiceArgs as any,
            ctx as any
        )
        expect(exercise.choice).toBe('TransferFactory_Transfer')
        expect(dc).toBe(ctx.disclosedContracts)
        expect(exercise.choiceArgument).toStrictEqual({
            expectedAdmin:
                'DSO::1220c69732dd5f3b434c283f61cbc29d3bb492c50c56e306b436c3e1741cbc7be53e',
            extraArgs: {
                context: {
                    values: {
                        ctx: 'data',
                    },
                },
                meta: {
                    values: {},
                },
            },
            transfer: {
                amount: '10.0',
                instrumentId: 'Amulet',
                receiver: 'bob',
                sender: 'v1-01-alice::12206eee60f64d90be3f823007d1321dc6acc5f4f2c57d3dd6ac1f66148753bb65c5',
            },
        })
    })

    it('creates transfer instruction', async () => {
        const { service } = makeService()
        const ctx = makeChoiceContext()

        const [exercise] =
            await service.transfer.createAcceptTransferInstruction(
                'cid',
                registryUrl,
                ctx as any
            )

        expect(exercise.choice).toBe('TransferInstruction_Accept')
        expect(exercise.contractId).toBe('cid')

        const [exerciseReject] =
            await service.transfer.createRejectTransferInstruction(
                'cid',
                registryUrl,
                ctx as any
            )
        expect(exerciseReject.choice).toBe('TransferInstruction_Reject')

        //TODO: do all of these where it fetches from registry when no ctx is provided
        const [exerciseWithdraw] =
            await service.transfer.createWithdrawTransferInstruction(
                'cid',
                registryUrl,
                ctx as any
            )
        expect(exerciseWithdraw.choice).toBe('TransferInstruction_Withdraw')
    })

    it.each([
        ['Accept', 'TransferInstruction_Accept'],
        ['Reject', 'TransferInstruction_Reject'],
        ['Withdraw', 'TransferInstruction_Withdraw'],
    ] as const)(
        '%s routes to correct choice',
        async (instructionChoice, expectedChoice) => {
            const { service, tokenClient } = makeService()
            tokenClient.post.mockResolvedValue(makeChoiceContext())
            const [exercise] = await service.transfer.createTransferInstruction(
                'cid',
                registryUrl,
                instructionChoice
            )

            expect(exercise.choice).toBe(expectedChoice)
        }
    )

    it('exercise delegate proxy accept', async () => {
        const { service, tokenClient } = makeService()
        tokenClient.post.mockResolvedValue(makeChoiceContext())
        const [exercise] =
            await service.transfer.exerciseDelegateProxyTransferInstructionAccept(
                'proxy-cid',
                'ti-cid',
                new URL(registryUrl),
                'app-right-cid',
                [{ beneficiary: senderParty, weight: 1.0 }]
            )

        expect(exercise.choice).toBe('DelegateProxy_TransferInstruction_Accept')
        expect(exercise.contractId).toBe('proxy-cid')
    })

    it('exercise delegate proxy withdraw', async () => {
        const { service, tokenClient } = makeService()
        tokenClient.post.mockResolvedValue(makeChoiceContext())
        const [exercise] =
            await service.transfer.exerciseDelegateProxyTransferInstructioWithdraw(
                'proxy-cid',
                'ti-cid',
                new URL(registryUrl),
                'app-right-cid',
                [{ beneficiary: senderParty, weight: 1.0 }]
            )

        expect(exercise.choice).toBe(
            'DelegateProxy_TransferInstruction_Withdraw'
        )
        expect(exercise.contractId).toBe('proxy-cid')
    })
    it('exercise delegate proxy reject', async () => {
        const { service, tokenClient } = makeService()
        tokenClient.post.mockResolvedValue(makeChoiceContext())
        const [exercise] =
            await service.transfer.exerciseDelegateProxyTransferInstructionReject(
                'proxy-cid',
                'ti-cid',
                new URL(registryUrl),
                'app-right-cid',
                [{ beneficiary: senderParty, weight: 1.0 }]
            )

        expect(exercise.choice).toBe('DelegateProxy_TransferInstruction_Reject')
        expect(exercise.contractId).toBe('proxy-cid')
    })

    it('exercise delegate proxy throws an error when sum of beneficiary weights exceed 1.0', async () => {
        const { service, tokenClient } = makeService()
        tokenClient.post.mockResolvedValue(makeChoiceContext())

        await expect(
            service.transfer.exerciseDelegateProxyTransferInstructioWithdraw(
                'proxy-cid',
                'ti-cid',
                new URL(registryUrl),
                'app-right-cid',
                [
                    { beneficiary: senderParty, weight: 1.0 },
                    { beneficiary: 'bob:def', weight: 1.0 },
                ]
            )
        ).rejects.toThrow('Sum of beneficiary weights is larger than 1.')
    })
})

describe('Token standard service', () => {
    it('should get instrument byId', async () => {
        const { service, getTokenStandardClient, tokenClient } = makeService()

        tokenClient.get.mockResolvedValue({ id: 'cc', name: 'amulet' })

        const instrument = await service.getInstrumentById(registryUrl, 'cc')
        expect(instrument.id).toBe('cc')
        expect(instrument.name).toBe('amulet')
        expect(getTokenStandardClient).toHaveBeenCalledWith(registryUrl)
    })

    it('should get instrumentAdmin', async () => {
        const { service, tokenClient } = makeService()

        tokenClient.get.mockResolvedValue({
            id: 'cc',
            name: 'amulet',
            adminId: 'blah:123',
        })

        const admin = await service.getInstrumentAdmin(registryUrl)
        expect(admin).toBe('blah:123')
    })

    it('convert the instruments to an asset type', async () => {
        const { service, tokenClient } = makeService()

        tokenClient.get
            .mockResolvedValueOnce({
                instruments: [
                    {
                        id: 'TestTokenExt',
                        name: 'TestTokenExt',
                        symbol: 'TestTokenExt',
                        totalSupply: '201.0',
                        totalSupplyAsOf: null,
                        decimals: 10,
                        supportedApis: {
                            'splice-api-token-metadata-v1': 1,
                            'splice-api-token-transfer-instruction-v1': 1,
                            'splice-api-token-allocation-request-v1': 1,
                            'splice-api-token-allocation-v1': 1,
                            'splice-api-token-holding-v1': 1,
                            'splice-api-token-allocation-instruction-v1': 1,
                        },
                    },
                    {
                        id: 'TestToken',
                        name: 'TestToken',
                        symbol: 'TestToken',
                        totalSupply: '1300.0',
                        totalSupplyAsOf: null,
                        decimals: 10,
                        supportedApis: {
                            'splice-api-token-metadata-v1': 1,
                            'splice-api-token-transfer-instruction-v1': 1,
                            'splice-api-token-allocation-request-v1': 1,
                            'splice-api-token-allocation-v1': 1,
                            'splice-api-token-holding-v1': 1,
                            'splice-api-token-allocation-instruction-v1': 1,
                        },
                    },
                ],
                nextPageToken: null,
            })
            .mockResolvedValue({
                adminId:
                    'auth0_007c6643538f2eadd3e573dd05b9::12205bcc106efa0eaa7f18dc491e5c6f5fb9b0cc68dc110ae66f4ed6467475d7c78e',
                supportedApis: {
                    'splice-api-token-metadata-v1': 1,
                    'splice-api-token-transfer-instruction-v1': 1,
                    'splice-api-token-allocation-request-v1': 1,
                    'splice-api-token-allocation-v1': 1,
                    'splice-api-token-holding-v1': 1,
                    'splice-api-token-allocation-instruction-v1': 1,
                },
            })

        const response = await service.instrumentsToAsset(registryUrl)
        expect(response).toStrictEqual([
            {
                admin: 'auth0_007c6643538f2eadd3e573dd05b9::12205bcc106efa0eaa7f18dc491e5c6f5fb9b0cc68dc110ae66f4ed6467475d7c78e',
                displayName: 'TestTokenExt',
                id: 'TestTokenExt',
                registryUrl: new URL('https://fake/registry'),
                symbol: 'TestTokenExt',
                capabilities: {
                    allocation: ['v1'],
                    allocationInstruction: ['v1'],
                    allocationRequest: ['v1'],
                    holding: ['v1'],
                    transferInstruction: ['v1'],
                },
            },
            {
                admin: 'auth0_007c6643538f2eadd3e573dd05b9::12205bcc106efa0eaa7f18dc491e5c6f5fb9b0cc68dc110ae66f4ed6467475d7c78e',
                displayName: 'TestToken',
                id: 'TestToken',
                registryUrl: new URL('https://fake/registry'),
                symbol: 'TestToken',
                capabilities: {
                    allocation: ['v1'],
                    allocationInstruction: ['v1'],
                    allocationRequest: ['v1'],
                    holding: ['v1'],
                    transferInstruction: ['v1'],
                },
            },
        ])
    })

    it('toPretty transactions', async () => {
        const { service } = makeService()
        const result = await service.core.toPrettyTransactions([], senderParty)
        expect(result.transactions).toHaveLength(0)
        expect(result.nextOffset).toBe(0)

        const updates = [
            { update: { OffsetCheckpoint: { value: { offset: 50 } } } },
            { update: { OffsetCheckpoint: { value: { offset: 80 } } } },
        ]

        const updatesResult = await service.core.toPrettyTransactions(
            updates as any,
            senderParty
        )
        expect(updatesResult.nextOffset).toBeGreaterThanOrEqual(80)
    })

    it('toQualfiedMemberId()', async () => {
        const { service } = makeService()
        expect(service.core.toQualifiedMemberId('abc123')).toBe('PAR::abc123')
        expect(service.core.toQualifiedMemberId('PAR::abc123')).toBe(
            'PAR::abc123'
        )
        expect(service.core.toQualifiedMemberId('MED::abc123')).toBe(
            'MED::abc123'
        )

        expect(() => service.core.toQualifiedMemberId('')).toThrow(
            'memberId is required'
        )
    })

    it('converts all instrument pages to assets', async () => {
        const { service, tokenClient } = makeService()

        tokenClient.get
            .mockResolvedValueOnce({
                instruments: [
                    {
                        id: 'first-token',
                        name: 'First Token',
                        symbol: 'FIRST',
                        supportedApis: {
                            'splice-api-token-transfer-instruction-v2': 1,
                            'splice-api-token-allocation-v1': 1,
                            'splice-api-token-holding-v2': 1,
                            'splice-api-token-allocation-instruction-v2': 1,
                            'splice-api-token-metadata-v1': 1,
                            'splice-api-token-allocation-v2': 1,
                            'splice-api-token-transfer-events-v2': 1,
                            'splice-api-token-transfer-instruction-v1': 1,
                            'splice-api-token-holding-v1': 1,
                            'splice-api-token-allocation-instruction-v1': 1,
                        },
                    },
                ],
                nextPageToken: 'page-2',
            })
            .mockResolvedValueOnce({
                instruments: [
                    {
                        id: 'second-token',
                        name: 'Second Token',
                        symbol: 'SECOND',
                        supportedApis: {
                            'splice-api-token-transfer-instruction-v2': 1,
                            'splice-api-token-allocation-v1': 1,
                            'splice-api-token-holding-v2': 1,
                            'splice-api-token-allocation-instruction-v2': 1,
                            'splice-api-token-metadata-v1': 1,
                            'splice-api-token-allocation-v2': 1,
                            'splice-api-token-transfer-events-v2': 1,
                            'splice-api-token-transfer-instruction-v1': 1,
                            'splice-api-token-holding-v1': 1,
                            'splice-api-token-allocation-instruction-v1': 1,
                        },
                    },
                ],
            })
            .mockResolvedValueOnce({ adminId: 'admin-id' })

        const response = await service.instrumentsToAsset(registryUrl)

        expect(tokenClient.get).toHaveBeenNthCalledWith(
            2,
            '/registry/metadata/v1/instruments',
            { query: { pageToken: 'page-2' } }
        )
        expect(
            tokenClient.get.mock.calls.filter(
                ([path]) => path === '/registry/metadata/v1/instruments'
            )
        ).toHaveLength(2)
        expect(response).toStrictEqual([
            {
                admin: 'admin-id',
                displayName: 'First Token',
                id: 'first-token',
                registryUrl,
                symbol: 'FIRST',
                capabilities: {
                    allocation: ['v1', 'v2'],
                    allocationInstruction: ['v1', 'v2'],
                    allocationRequest: [],
                    holding: ['v1', 'v2'],
                    transferInstruction: ['v1', 'v2'],
                },
            },
            {
                admin: 'admin-id',
                displayName: 'Second Token',
                id: 'second-token',
                registryUrl,
                symbol: 'SECOND',
                capabilities: {
                    allocation: ['v1', 'v2'],
                    allocationInstruction: ['v1', 'v2'],
                    holding: ['v1', 'v2'],
                    transferInstruction: ['v1', 'v2'],
                    allocationRequest: [],
                },
            },
        ])
    })

    describe('isHoldingLocked', () => {
        // Used for relative time
        const createdAt = '2026-09-01T10:00:00.000Z'

        const past = '2026-09-01T10:59:59.999Z'
        const pastRel = { microseconds: '3599999000' }

        const now = '2026-09-01T11:00:00.000Z'
        const nowRel = { microseconds: '3600000000' }

        const future = '2026-09-01T11:00:00.001Z'
        const futureRel = { microseconds: '3600001000' }

        it.each([
            [null, false],
            [{}, true],
            [{ expiresAt: null }, true],
            [{ expiresAt: past }, false],
            [{ expiresAt: now }, false],
            [{ expiresAt: future }, true],
            [{ expiresAfter: pastRel }, false],
            [{ expiresAfter: nowRel }, false],
            [{ expiresAfter: futureRel }, true],
            [{ expiresAt: future, expiresAfter: futureRel }, true],
            [{ expiresAt: now, expiresAfter: futureRel }, false],
            [{ expiresAt: future, expiresAfter: nowRel }, false],
        ])('holding locked with lock %o returns %s', (lock, expected) => {
            expect(
                TokenStandardService.isHoldingLocked(
                    {
                        interfaceViewValue: {
                            lock,
                            owner: '',
                            instrumentId: {
                                admin: '',
                                id: '',
                            },
                            amount: '',
                            meta: undefined,
                        },
                        contractId: '',
                        activeContract: {
                            createdEvent: { createdAt },
                            synchronizerId: '',
                            reassignmentCounter: 0,
                        },
                    } as any,
                    new Date(now)
                )
            ).toBe(expected)
        })
    })

    it('create delegate proxy transfer', async () => {
        const { service } = makeService()
        vi.spyOn(service.transfer, 'createTransfer').mockResolvedValue([
            { contractId: 'transfer-cid', choiceArgument: {} } as any,
            [],
        ])

        const [exercise] = await service.createDelegateProxyTransfer(
            senderParty,
            'bob::def',
            '10.0',
            instrumentAdmin,
            instrumentId,
            registryUrl,
            'app-right-cid',
            'proxy-cid',
            [{ beneficiary: senderParty, weight: 0.5 }]
        )

        expect(exercise).toStrictEqual({
            choice: 'DelegateProxy_TransferFactory_Transfer',
            choiceArgument: {
                cid: 'transfer-cid',
                proxyArg: {
                    beneficiaries: [
                        {
                            beneficiary:
                                'v1-01-alice::12206eee60f64d90be3f823007d1321dc6acc5f4f2c57d3dd6ac1f66148753bb65c5',
                            weight: 0.5,
                        },
                    ],
                    choiceArg: {},
                    featuredAppRightCid: 'app-right-cid',
                },
            },
            contractId: 'proxy-cid',
            templateId:
                '#splice-util-featured-app-proxies:Splice.Util.FeaturedApp.DelegateProxy:DelegateProxy',
        })
    })

    it('accepts delegate proxy transfer instruction accept', async () => {
        const { service } = makeService()

        const ctx = makeChoiceContext()
        vi.spyOn(
            service.transfer,
            'fetchAcceptTransferInstructionChoiceContext'
        ).mockResolvedValue(ctx)

        const [exercise] =
            await service.exerciseDelegateProxyTransferInstructionAccept(
                senderParty,
                'proxy-cid',
                'transfer-cid',
                registryUrl,
                'app-right'
            )

        expect(exercise).toStrictEqual({
            choice: 'DelegateProxy_TransferInstruction_Accept',
            choiceArgument: {
                cid: 'transfer-cid',
                proxyArg: {
                    beneficiaries: [
                        {
                            beneficiary:
                                'v1-01-alice::12206eee60f64d90be3f823007d1321dc6acc5f4f2c57d3dd6ac1f66148753bb65c5',
                            weight: 1,
                        },
                    ],
                    choiceArg: {
                        extraArgs: {
                            context: {
                                values: {
                                    ctx: 'data',
                                },
                            },
                            meta: {
                                values: {},
                            },
                        },
                    },
                    featuredAppRightCid: 'app-right',
                },
            },
            contractId: 'proxy-cid',
            templateId:
                '#splice-util-featured-app-proxies:Splice.Util.FeaturedApp.DelegateProxy:DelegateProxy',
        })
    })

    it('lists contracts by interface', async () => {
        const { service } = makeService()
        const spy = vi
            .spyOn(service.core, 'listContractsByInterface')
            .mockResolvedValue([])

        await service.listContractsByInterface(
            'interface::id',
            senderParty,
            10,
            5,
            true
        )
        expect(spy).toHaveBeenCalledWith(
            'interface::id',
            senderParty,
            10,
            5,
            true
        )
    })

    it('registries to assets', async () => {
        const { service, tokenClient } = makeService()
        expect(await service.registriesToAssets([])).toEqual([])

        tokenClient.get
            .mockResolvedValueOnce({
                instruments: [
                    {
                        id: 'USDCx',
                        name: 'USDCx',
                        symbol: 'USDCx',
                        totalSupply: '3235186.362102',
                        totalSupplyAsOf: null,
                        decimals: 10,
                        supportedApis: {
                            'splice-api-token-metadata-v1': 1,
                            'splice-api-token-transfer-instruction-v1': 1,
                            'splice-api-token-allocation-request-v1': 1,
                            'splice-api-token-allocation-v1': 1,
                            'splice-api-token-holding-v1': 1,
                            'splice-api-token-allocation-instruction-v1': 1,
                        },
                    },
                ],
                nextPageToken: null,
            })
            .mockResolvedValueOnce({ adminId: 'admin-a' })
            .mockResolvedValueOnce({
                instruments: [
                    {
                        id: 'TestTokenExt',
                        name: 'TestTokenExt',
                        symbol: 'TestTokenExt',
                        totalSupply: '201.0',
                        totalSupplyAsOf: null,
                        decimals: 10,
                        supportedApis: {
                            'splice-api-token-metadata-v1': 1,
                            'splice-api-token-transfer-instruction-v1': 1,
                            'splice-api-token-allocation-request-v1': 1,
                            'splice-api-token-allocation-v1': 1,
                            'splice-api-token-holding-v1': 1,
                            'splice-api-token-allocation-instruction-v1': 1,
                        },
                    },
                    {
                        id: 'TestToken',
                        name: 'TestToken',
                        symbol: 'TestToken',
                        totalSupply: '1300.0',
                        totalSupplyAsOf: null,
                        decimals: 10,
                        supportedApis: {
                            'splice-api-token-metadata-v1': 1,
                            'splice-api-token-transfer-instruction-v1': 1,
                            'splice-api-token-allocation-request-v1': 1,
                            'splice-api-token-allocation-v1': 1,
                            'splice-api-token-holding-v1': 1,
                            'splice-api-token-allocation-instruction-v1': 1,
                        },
                    },
                ],
                nextPageToken: null,
            })
            .mockResolvedValueOnce({ adminId: 'admin-b' })

        const result = await service.registriesToAssets([
            'http://registry1.com',
            'http://registry2.com',
        ])
        expect(result).toStrictEqual([
            {
                admin: 'admin-a',
                displayName: 'USDCx',
                id: 'USDCx',
                registryUrl: 'http://registry1.com',
                symbol: 'USDCx',
                capabilities: {
                    allocation: ['v1'],
                    allocationInstruction: ['v1'],
                    allocationRequest: ['v1'],
                    holding: ['v1'],
                    transferInstruction: ['v1'],
                },
            },
            {
                admin: 'admin-b',
                displayName: 'TestTokenExt',
                id: 'TestTokenExt',
                registryUrl: 'http://registry2.com',
                symbol: 'TestTokenExt',
                capabilities: {
                    allocation: ['v1'],
                    allocationInstruction: ['v1'],
                    allocationRequest: ['v1'],
                    holding: ['v1'],
                    transferInstruction: ['v1'],
                },
            },
            {
                admin: 'admin-b',
                displayName: 'TestToken',
                id: 'TestToken',
                registryUrl: 'http://registry2.com',
                symbol: 'TestToken',
                capabilities: {
                    allocation: ['v1'],
                    allocationInstruction: ['v1'],
                    allocationRequest: ['v1'],
                    holding: ['v1'],
                    transferInstruction: ['v1'],
                },
            },
        ])
    })

    it('list holding transactions', async () => {
        const { service, provider } = makeService()
        provider.request
            .mockResolvedValueOnce({ participantPrunedUpToInclusive: 5 })
            .mockResolvedValueOnce({ offset: 100 })
            .mockResolvedValueOnce([])

        vi.spyOn(service.core, 'toPrettyTransactions').mockResolvedValue({
            nextOffset: 100,
            transactions: [],
        })
        await service.listHoldingTransactions(senderParty)

        const providerCalls = provider.request.mock.calls.map(
            (c: any) => c[0].params
        )

        expect(providerCalls).toEqual([
            {
                resource: '/v2/state/latest-pruned-offsets',
                requestMethod: 'get',
            },
            {
                resource: '/v2/state/ledger-end',
                requestMethod: 'get',
                query: {},
            },
            {
                resource: '/v2/updates',
                requestMethod: 'post',
                query: {},
                body: {
                    updateFormat: {
                        includeTransactions: {
                            eventFormat: {
                                filtersByParty: {
                                    'v1-01-alice::12206eee60f64d90be3f823007d1321dc6acc5f4f2c57d3dd6ac1f66148753bb65c5':
                                        {
                                            cumulative: [
                                                {
                                                    identifierFilter: {
                                                        InterfaceFilter: {
                                                            value: {
                                                                interfaceId:
                                                                    '#splice-api-token-holding-v1:Splice.Api.Token.HoldingV1:Holding',
                                                                includeInterfaceView: true,
                                                                includeCreatedEventBlob: true,
                                                            },
                                                        },
                                                    },
                                                },
                                                {
                                                    identifierFilter: {
                                                        InterfaceFilter: {
                                                            value: {
                                                                interfaceId:
                                                                    '#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferFactory',
                                                                includeInterfaceView: true,
                                                                includeCreatedEventBlob: true,
                                                            },
                                                        },
                                                    },
                                                },
                                                {
                                                    identifierFilter: {
                                                        InterfaceFilter: {
                                                            value: {
                                                                interfaceId:
                                                                    '#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferInstruction',
                                                                includeInterfaceView: true,
                                                                includeCreatedEventBlob: true,
                                                            },
                                                        },
                                                    },
                                                },
                                                {
                                                    identifierFilter: {
                                                        InterfaceFilter: {
                                                            value: {
                                                                interfaceId:
                                                                    '#splice-api-token-allocation-instruction-v1:Splice.Api.Token.AllocationInstructionV1:AllocationFactory',
                                                                includeInterfaceView: true,
                                                                includeCreatedEventBlob: true,
                                                            },
                                                        },
                                                    },
                                                },
                                                {
                                                    identifierFilter: {
                                                        InterfaceFilter: {
                                                            value: {
                                                                interfaceId:
                                                                    '#splice-api-token-allocation-instruction-v1:Splice.Api.Token.AllocationInstructionV1:AllocationInstruction',
                                                                includeInterfaceView: true,
                                                                includeCreatedEventBlob: true,
                                                            },
                                                        },
                                                    },
                                                },
                                                {
                                                    identifierFilter: {
                                                        InterfaceFilter: {
                                                            value: {
                                                                interfaceId:
                                                                    '#splice-api-token-allocation-v1:Splice.Api.Token.AllocationV1:Allocation',
                                                                includeInterfaceView: true,
                                                                includeCreatedEventBlob: true,
                                                            },
                                                        },
                                                    },
                                                },
                                                {
                                                    identifierFilter: {
                                                        InterfaceFilter: {
                                                            value: {
                                                                interfaceId:
                                                                    '#splice-api-token-allocation-request-v1:Splice.Api.Token.AllocationRequestV1:AllocationRequest',
                                                                includeInterfaceView: true,
                                                                includeCreatedEventBlob: true,
                                                            },
                                                        },
                                                    },
                                                },
                                                {
                                                    identifierFilter: {
                                                        WildcardFilter: {
                                                            value: {
                                                                includeCreatedEventBlob: true,
                                                            },
                                                        },
                                                    },
                                                },
                                            ],
                                        },
                                },
                                verbose: false,
                            },
                            transactionShape:
                                'TRANSACTION_SHAPE_LEDGER_EFFECTS',
                        },
                    },
                    beginExclusive: 5,
                    endInclusive: 100,
                },
            },
        ])
    })

    it('transaction by id', async () => {
        const { service, provider } = makeService()
        provider.request.mockResolvedValue({
            update: { Transaction: { value: {} } },
        })
        vi.spyOn(service.core, 'toPrettyTransaction').mockResolvedValue({
            id: 'tx-1',
        } as any)

        await service.getTransactionById('update-abc', senderParty)
        const [call] = provider.request.mock.calls
        expect(call[0].params.resource).toBe('/v2/updates/update-by-id')
        expect(call[0].params.requestMethod).toBe('post')
        expect(call[0].params.body).toMatchObject({
            updateId: 'update-abc',
            updateFormat: {
                includeTransactions: {
                    transactionShape: 'TRANSACTION_SHAPE_LEDGER_EFFECTS',
                },
            },
        })
    })

    it('to pretty transactions process transaction updates', async () => {
        const { service } = makeService()
        const toUpdate = (tx: (typeof rawTransactions)[number]) => ({
            update: { Transaction: { value: tx } },
        })

        const prettyTx4 = (prettyTransactions as any[]).find(
            (t) => t.offset === 4
        )
        mockParseTransaction
            .mockResolvedValueOnce({ offset: 0, events: [] })
            .mockResolvedValueOnce({ offset: 1, events: [] })
            .mockResolvedValueOnce({ offset: 2, events: [] })
            .mockResolvedValueOnce({ offset: 3, events: [] })
            .mockResolvedValueOnce({ offset: 4, events: prettyTx4.events })

        const updates = rawTransactions
            .filter((tx) => tx.offset <= 4)
            .map(toUpdate)

        const result = await service.core.toPrettyTransactions(
            updates as any,
            'alice::normalized'
        )
        expect(result.transactions).toHaveLength(1)
        expect(result.nextOffset).toBe(4)
    })

    it('to pretty transactions picks higher checkpoint offset vs tx offset', async () => {
        const { service } = makeService()

        const prettyTx7 = (prettyTransactions as any[]).find(
            (t) => t.offset === 7
        )
        mockParseTransaction.mockResolvedValueOnce({
            ...prettyTx7,
            offset: 7,
            events: prettyTx7.events,
        })

        const updates = [
            { update: { OffsetCheckpoint: { value: { offset: 50 } } } },
            {
                update: {
                    Transaction: {
                        value: rawTransactions.find((t) => t.offset === 7),
                    },
                },
            },
        ]

        const result = await service.core.toPrettyTransactions(
            updates as any,
            'alice::normalized'
        )
        expect(result.nextOffset).toBe(50)
        expect(result.transactions).toHaveLength(1)
    })

    it('list contracts by interface', async () => {
        const { service } = makeService()

        mockAcsState.mockResolvedValue([
            {
                contractEntry: {
                    JsActiveContract: {
                        createdEvent: {
                            contractId: '16',
                            interfaceViews: [],
                        },
                    },
                },
            },
        ])

        vi.spyOn(service.core, 'toPrettyContract').mockReturnValue({
            contractId: '16',
            activeContract: {} as any,
            interfaceViewValue: {
                amount: '200.0000',
                instrumentId: {
                    admin: instrumentAdmin,
                    id: 'Amulet',
                },
                lock: null,
                owner: senderParty,
            },
            fetchedAtOffset: 4,
        })

        const results = await service.core.listContractsByInterface(
            'splice-api-token-v1-Holding',
            senderParty,
            undefined,
            4
        )

        expect(results[0]).toStrictEqual({
            activeContract: {},
            contractId: '16',
            fetchedAtOffset: 4,
            interfaceViewValue: {
                amount: '200.0000',
                instrumentId: {
                    admin: 'DSO::1220c69732dd5f3b434c283f61cbc29d3bb492c50c56e306b436c3e1741cbc7be53e',
                    id: 'Amulet',
                },
                lock: null,
                owner: 'v1-01-alice::12206eee60f64d90be3f823007d1321dc6acc5f4f2c57d3dd6ac1f66148753bb65c5',
            },
        })
    })
})
