// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, type MockedObject } from 'vitest'
import { AllocationService } from './allocation-service.js'
import type { CoreService } from '../core-service.js'
import type { Logger } from '@canton-network/core-types'
import type {
    AllocationFactory_Allocate as AllocationFactory_AllocateV2,
    AllocationSpecification,
    AllocationRequestView as AllocationRequestViewV2,
    SettlementInfo,
    SettlementFactory_SettleBatch as SettlementFactory_SettleBatchV2,
    TransferLeg,
    FinalizedAllocation,
    OffLedger,
    Account,
    TransferLegSide,
} from '@canton-network/core-token-standard-v2'
import {
    ALLOCATION_FACTORY_INTERFACE_ID_V2,
    ALLOCATION_INTERFACE_ID_V2,
    ALLOCATION_REQUEST_INTERFACE_ID_V2,
    ALLOCATION_INSTRUCTION_INTERFACE_ID_V2,
} from '@canton-network/core-token-standard-v2'

type AllocationChoiceContextV2 =
    OffLedger.AllocationInstructionV2.components['schemas']['ChoiceContext']
type DisclosedContractV2 =
    AllocationChoiceContextV2['disclosedContracts'][number]

const mockLogger: MockedObject<Logger> = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
} as MockedObject<Logger>

const makeTokenClient = () => ({ get: vi.fn(), post: vi.fn() })

type CoreServiceDeps = Pick<
    CoreService,
    'getInputHoldingCidsForAccount' | 'getTokenStandardClientV2'
>

function makeService() {
    const tokenClient = makeTokenClient()

    const core: CoreServiceDeps = {
        getInputHoldingCidsForAccount: vi.fn().mockResolvedValue([]),
        getTokenStandardClientV2: vi.fn().mockReturnValue(tokenClient),
    }

    const service = new AllocationService(core as CoreService, mockLogger)

    return { service, core, tokenClient }
}

const registryUrl = new URL('https://fake/registry')

const instrumentAdmin =
    'DSO::1220c69732dd5f3b434c283f61cbc29d3bb492c50c56e306b436c3e1741cbc7be53e'
const instrumentId = 'Amulet'

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
    owner: 'v1-01-alice::12206eee60f64d90be3f823007d1321dc6acc5f4f2c57d3dd6ac1f66148753bb65c5',
    provider: 'provider::123',
    id: '',
    ...overrides,
})

const makeLegSide = (
    overrides: Partial<TransferLegSide> = {}
): TransferLegSide => ({
    transferLegId: 'leg-1',
    side: 'SenderSide',
    otherside: makeAccount({ owner: 'counterparty::owner', provider: null }),
    amount: '10',
    instrumentId,
    meta: { values: {} },
    ...overrides,
})

const makeAllocationSpec = (
    overrides: Partial<AllocationSpecification> = {}
): AllocationSpecification => ({
    admin: instrumentAdmin,
    authorizer: makeAccount(),
    transferLegSides: [makeLegSide()],
    settlementDeadline: null,
    nextIterationFunding: {},
    committed: false,
    meta: { values: {} },
    ...overrides,
})

const makeSettlement = (
    overrides: Partial<SettlementInfo> = {}
): SettlementInfo => ({
    executors: [],
    id: 'settle-1',
    cid: null,
    meta: { values: {} },
    ...overrides,
})

const makeChoiceContext = (
    overrides: Partial<AllocationChoiceContextV2> = {}
): AllocationChoiceContextV2 => ({
    choiceContextData: { values: { ctx: 'data' } } as unknown as Record<
        string,
        never
    >,
    disclosedContracts: [
        {
            contractId: 'disc1',
            templateId: 'templateId',
            createdEventBlob: 'blah',
            synchronizerId: 'mysync',
        },
    ],
    ...overrides,
})

describe('AllocationService', () => {
    describe('fundingNeeds', () => {
        it('adds SenderSide amounts and subtracts ReceiverSide amounts per instrument', () => {
            const spec = makeAllocationSpec({
                transferLegSides: [
                    makeLegSide({
                        instrumentId: 'amulet',
                        amount: '10',
                        side: 'SenderSide',
                    }),
                    makeLegSide({
                        instrumentId: 'amulet',
                        amount: '4',
                        side: 'ReceiverSide',
                    }),
                    makeLegSide({
                        instrumentId: 'usdcx',
                        amount: '5',
                        side: 'SenderSide',
                    }),
                ],
            })

            const needs = AllocationService.fundingNeeds(spec)

            expect(needs.get('amulet')?.toString()).toBe('6')
            expect(needs.get('usdcx')?.toString()).toBe('5')
        })

        it('adds nextIterationFunding amounts on top of transfer leg needs', () => {
            const spec = makeAllocationSpec({
                transferLegSides: [
                    makeLegSide({
                        instrumentId: 'amulet',
                        amount: '10',
                        side: 'SenderSide',
                    }),
                ],
                nextIterationFunding: { amulet: '5', usdcx: '3' },
            })

            const needs = AllocationService.fundingNeeds(spec)

            expect(needs.get('amulet')?.toString()).toBe('15')
            expect(needs.get('usdcx')?.toString()).toBe('3')
        })

        it('drops instruments whose net need is zero or negative', () => {
            const spec = makeAllocationSpec({
                transferLegSides: [
                    makeLegSide({
                        instrumentId: 'amulet',
                        amount: '10',
                        side: 'ReceiverSide',
                    }),
                ],
                nextIterationFunding: { amulet: '10' },
            })

            const needs = AllocationService.fundingNeeds(spec)

            expect(needs.has('amulet')).toBe(false)
        })
    })

    describe('buildAllocateChoiceArgs', () => {
        const settlement = makeSettlement()

        it('uses explicit inputUtxos without calling core.getInputHoldingCidsForAccount', async () => {
            const { service, core } = makeService()
            const spec = makeAllocationSpec()

            const result = await service.buildAllocateChoiceArgs({
                settlement,
                spec,
                admin: instrumentAdmin,
                inputUtxos: ['utxo-1', 'utxo-2'],
            })

            expect(core.getInputHoldingCidsForAccount).not.toHaveBeenCalled()
            expect(result.inputHoldingCids).toEqual(['utxo-1', 'utxo-2'])
        })

        it('fetches input holdings per instrument from funding needs when no inputUtxos given', async () => {
            const { service, core } = makeService()
            core.getInputHoldingCidsForAccount = vi
                .fn()
                .mockResolvedValueOnce(['cid-a'])
                .mockResolvedValueOnce(['cid-b'])

            const spec = makeAllocationSpec({
                transferLegSides: [
                    makeLegSide({
                        instrumentId: 'amulet',
                        amount: '10',
                        side: 'SenderSide',
                    }),
                    makeLegSide({
                        instrumentId: 'usdcx',
                        amount: '5',
                        side: 'SenderSide',
                    }),
                ],
            })

            const result = await service.buildAllocateChoiceArgs({
                settlement,
                spec,
                admin: instrumentAdmin,
            })

            expect(core.getInputHoldingCidsForAccount).toHaveBeenCalledTimes(2)
            expect(result.inputHoldingCids).toEqual(['cid-a', 'cid-b'])
        })

        it('throws when the authorizer account has no owner and no actors are given', async () => {
            const { service } = makeService()
            const spec = makeAllocationSpec({
                authorizer: makeAccount({ owner: '' }),
            })

            await expect(
                service.buildAllocateChoiceArgs({
                    settlement,
                    spec,
                    admin: instrumentAdmin,
                })
            ).rejects.toThrow(
                'Ownerless authorizer account: actors must be provided explicitly'
            )
        })

        it('defaults actors to the authorizer owner when not provided', async () => {
            const { service } = makeService()
            const spec = makeAllocationSpec()

            const result = await service.buildAllocateChoiceArgs({
                settlement,
                spec,
                admin: instrumentAdmin,
            })

            expect(result.actors).toEqual([spec.authorizer.owner])
        })

        it('uses explicit actors instead of deriving from the authorizer', async () => {
            const { service } = makeService()
            const spec = makeAllocationSpec({
                authorizer: makeAccount({ owner: '' }),
            })

            const result = await service.buildAllocateChoiceArgs({
                settlement,
                spec,
                admin: instrumentAdmin,
                actors: ['explicit::actor'],
            })

            expect(result.actors).toEqual(['explicit::actor'])
        })

        it('respects an explicit requestedAt and otherwise defaults to now minus skew', async () => {
            const { service } = makeService()
            const spec = makeAllocationSpec()

            const explicit = await service.buildAllocateChoiceArgs({
                settlement,
                spec,
                admin: instrumentAdmin,
                requestedAt: '2026-01-01T00:00:00.000Z',
            })
            expect(explicit.requestedAt).toBe('2026-01-01T00:00:00.000Z')

            const before = Date.now()
            const defaulted = await service.buildAllocateChoiceArgs({
                settlement,
                spec,
                admin: instrumentAdmin,
            })
            const requestedAtMs = new Date(defaulted.requestedAt).getTime()
            expect(requestedAtMs).toBeLessThanOrEqual(before)
        })

        it('returns the settlement and allocation spec unmodified, with empty extraArgs', async () => {
            const { service } = makeService()
            const spec = makeAllocationSpec()

            const result = await service.buildAllocateChoiceArgs({
                settlement,
                spec,
                admin: instrumentAdmin,
            })

            expect(result.settlement).toBe(settlement)
            expect(result.allocation).toBe(spec)
            expect(result.extraArgs).toEqual({
                context: { values: {} },
                meta: { values: {} },
            })
        })
    })

    describe('createAllocation', () => {
        const settlement = makeSettlement()
        const spec = makeAllocationSpec()

        it('uses a prefetched context and does not make a registry call', async () => {
            const { service, tokenClient } = makeService()
            const ctx = makeChoiceContext()

            const [exercise] = await service.createAllocation(
                { settlement, spec, admin: instrumentAdmin },
                registryUrl,
                { factoryId: 'factory-id', choiceContext: ctx }
            )

            expect(tokenClient.post).not.toHaveBeenCalled()
            expect(exercise.contractId).toBe('factory-id')
            expect(exercise.choice).toBe('AllocationFactory_Allocate')
        })

        it('makes a registry call when no prefetched context is provided', async () => {
            const { service, tokenClient } = makeService()
            const ctx = makeChoiceContext()
            tokenClient.post.mockResolvedValue({
                factoryId: 'factory-id',
                choiceContext: ctx,
            })

            const [exercise] = await service.createAllocation(
                { settlement, spec, admin: instrumentAdmin },
                registryUrl
            )

            expect(tokenClient.post).toHaveBeenCalledWith(
                '/registry/allocation-instruction/v2/allocation-factory',
                expect.objectContaining({ excludeDebugFields: true })
            )
            expect(exercise.contractId).toBe('factory-id')
        })
    })

    describe('fetchAllocationChoiceContext', () => {
        it.each(['withdraw', 'cancel'] as const)(
            'posts to the %s choice-context endpoint with the allocation cid',
            async (action) => {
                const { service, tokenClient } = makeService()
                const ctx = makeChoiceContext()
                tokenClient.post.mockResolvedValue(ctx)

                const result = await service.fetchAllocationChoiceContext(
                    action,
                    'allocation-cid',
                    registryUrl
                )

                expect(tokenClient.post).toHaveBeenCalledWith(
                    `/registry/allocations/v2/{allocationId}/choice-contexts/${action}`,
                    { excludeDebugFields: true },
                    { path: { allocationId: 'allocation-cid' } }
                )
                expect(result).toBe(ctx)
            }
        )
    })

    describe('createAllocationChoiceFromContext', () => {
        it('builds Allocation_Withdraw for the withdraw action', async () => {
            const { service } = makeService()
            const ctx = makeChoiceContext()

            const [exercise, disclosed] =
                await service.createAllocationChoiceFromContext(
                    'withdraw',
                    'allocation-cid',
                    ['actor::1'],
                    ctx
                )

            expect(exercise).toStrictEqual({
                templateId: ALLOCATION_INTERFACE_ID_V2,
                contractId: 'allocation-cid',
                choice: 'Allocation_Withdraw',
                choiceArgument: {
                    actors: ['actor::1'],
                    extraArgs: {
                        context: ctx.choiceContextData,
                        meta: { values: {} },
                    },
                },
            })
            expect(disclosed).toBe(ctx.disclosedContracts)
        })

        it('builds Allocation_Cancel for the cancel action', async () => {
            const { service } = makeService()
            const ctx = makeChoiceContext()

            const [exercise] = await service.createAllocationChoiceFromContext(
                'cancel',
                'allocation-cid',
                ['actor::1'],
                ctx
            )

            expect(exercise.choice).toBe('Allocation_Cancel')
        })

        it('defaults disclosedContracts to an empty array when absent', async () => {
            const { service } = makeService()

            const ctx = {
                ...makeChoiceContext(),
                disclosedContracts: undefined,
            } as unknown as AllocationChoiceContextV2

            const [, disclosed] =
                await service.createAllocationChoiceFromContext(
                    'cancel',
                    'allocation-cid',
                    ['actor::1'],
                    ctx
                )

            expect(disclosed).toEqual([])
        })
    })

    describe('createAllocationChoice', () => {
        it('uses a prefetched context and skips fetching one', async () => {
            const { service, tokenClient } = makeService()
            const ctx = makeChoiceContext()

            const [exercise] = await service.createAllocationChoice(
                'withdraw',
                'allocation-cid',
                ['actor::1'],
                registryUrl,
                ctx
            )

            expect(tokenClient.post).not.toHaveBeenCalled()
            expect(exercise.choice).toBe('Allocation_Withdraw')
        })

        it('fetches a choice context from the registry when none is prefetched', async () => {
            const { service, tokenClient } = makeService()
            const ctx = makeChoiceContext()
            tokenClient.post.mockResolvedValue(ctx)

            const [exercise] = await service.createAllocationChoice(
                'cancel',
                'allocation-cid',
                ['actor::1'],
                registryUrl
            )

            expect(tokenClient.post).toHaveBeenCalledWith(
                '/registry/allocations/v2/{allocationId}/choice-contexts/cancel',
                { excludeDebugFields: true },
                { path: { allocationId: 'allocation-cid' } }
            )
            expect(exercise.choice).toBe('Allocation_Cancel')
        })
    })

    describe('createAllocationRequestChoice', () => {
        it('builds AllocationRequest_Reject for the reject action', () => {
            const { service } = makeService()

            const [exercise, disclosed] = service.createAllocationRequestChoice(
                'reject',
                'request-cid',
                ['actor::1']
            )

            expect(exercise).toStrictEqual({
                templateId: ALLOCATION_REQUEST_INTERFACE_ID_V2,
                contractId: 'request-cid',
                choice: 'AllocationRequest_Reject',
                choiceArgument: {
                    actors: ['actor::1'],
                    extraArgs: {
                        context: { values: {} },
                        meta: { values: {} },
                    },
                },
            })
            expect(disclosed).toEqual([])
        })

        it('builds AllocationRequest_Withdraw for the withdraw action', () => {
            const { service } = makeService()

            const [exercise] = service.createAllocationRequestChoice(
                'withdraw',
                'request-cid',
                ['actor::1']
            )

            expect(exercise.choice).toBe('AllocationRequest_Withdraw')
        })
    })

    describe('createWithdrawAllocationInstruction', () => {
        it('builds an AllocationInstruction_Withdraw exercise command', () => {
            const { service } = makeService()

            const [exercise, disclosed] =
                service.createWithdrawAllocationInstruction('withdraw-cid', [
                    'actor::1',
                ])

            expect(exercise).toStrictEqual({
                templateId: ALLOCATION_INSTRUCTION_INTERFACE_ID_V2,
                contractId: 'withdraw-cid',
                choice: 'AllocationInstruction_Withdraw',
                choiceArgument: {
                    actors: ['actor::1'],
                    extraArgs: {
                        context: { values: {} },
                        meta: { values: {} },
                    },
                },
            })
            expect(disclosed).toEqual([])
        })
    })

    describe('createAllocationFromContext', () => {
        const choiceArgs: AllocationFactory_AllocateV2 = {
            settlement: makeSettlement(),
            allocation: makeAllocationSpec(),
            requestedAt: new Date().toISOString(),
            inputHoldingCids: [],
            actors: ['actor::1'],
            extraArgs: { context: { values: {} }, meta: { values: {} } },
        }

        it('merges the choice context into extraArgs and builds the exercise command', async () => {
            const { service } = makeService()
            const ctx = makeChoiceContext()

            const [exercise, disclosed] =
                await service.createAllocationFromContext(
                    'factory-id',
                    choiceArgs,
                    ctx
                )

            expect(exercise.templateId).toBe(ALLOCATION_FACTORY_INTERFACE_ID_V2)
            expect(exercise.contractId).toBe('factory-id')
            expect(exercise.choice).toBe('AllocationFactory_Allocate')
            expect(
                (exercise.choiceArgument as AllocationFactory_AllocateV2)
                    .extraArgs.context
            ).toEqual({ values: { ctx: 'data' } })
            expect(disclosed).toBe(ctx.disclosedContracts)
        })

        it('falls back to empty values when choiceContextData has none', async () => {
            const { service } = makeService()
            const ctx = makeChoiceContext({ choiceContextData: {} })

            const [exercise] = await service.createAllocationFromContext(
                'factory-id',
                choiceArgs,
                ctx
            )

            expect(
                (exercise.choiceArgument as AllocationFactory_AllocateV2)
                    .extraArgs.context
            ).toEqual({ values: {} })
        })
    })

    describe('fetchSettlementFactory', () => {
        const makeSettleBatchArgs = (
            overrides: Partial<SettlementFactory_SettleBatchV2> = {}
        ): SettlementFactory_SettleBatchV2 => ({
            settlement: makeSettlement(),
            transferLegs: [] as TransferLeg[],
            allocations: [] as FinalizedAllocation[],
            actors: [],
            extraArgs: { context: { values: {} }, meta: { values: {} } },
            ...overrides,
        })

        it('posts the settlement factory args to the registry', async () => {
            const { service, tokenClient } = makeService()
            tokenClient.post.mockResolvedValue({ factoryId: 'settle-factory' })

            const result = await service.fetchSettlementFactory(
                makeSettleBatchArgs(),
                registryUrl
            )

            expect(tokenClient.post).toHaveBeenCalledWith(
                '/registry/allocation/v2/settlement-factory',
                expect.objectContaining({ excludeDebugFields: true })
            )
            expect(result).toEqual({ factoryId: 'settle-factory' })
        })
    })

    describe('createAllocationsForRequest', () => {
        const makeRequest = (
            specs: AllocationSpecification[]
        ): AllocationRequestViewV2 =>
            ({
                settlement: makeSettlement(),
                allocations: specs,
            }) as AllocationRequestViewV2

        const makeAllocationCommand = (
            inputHoldingCids: string[]
        ): AllocationFactory_AllocateV2 => ({
            settlement: makeSettlement(),
            allocation: makeAllocationSpec(),
            requestedAt: new Date().toISOString(),
            inputHoldingCids:
                inputHoldingCids as unknown as AllocationFactory_AllocateV2['inputHoldingCids'],
            actors: [],
            extraArgs: { context: { values: {} }, meta: { values: {} } },
        })

        it('creates one allocation command per spec plus an accept command, deduping disclosed contracts', async () => {
            const { service } = makeService()

            const dcA: DisclosedContractV2 = {
                contractId: 'disc-a',
                templateId: 't',
                createdEventBlob: 'b',
                synchronizerId: 's',
            }
            const dcShared: DisclosedContractV2 = {
                contractId: 'disc-shared',
                templateId: 't',
                createdEventBlob: 'b',
                synchronizerId: 's',
            }

            vi.spyOn(service, 'createAllocation')
                .mockResolvedValueOnce([
                    {
                        templateId: ALLOCATION_FACTORY_INTERFACE_ID_V2,
                        contractId: 'factory-1',
                        choice: 'AllocationFactory_Allocate',
                        choiceArgument: makeAllocationCommand(['cid-1']),
                    },
                    [dcA, dcShared],
                ])
                .mockResolvedValueOnce([
                    {
                        templateId: ALLOCATION_FACTORY_INTERFACE_ID_V2,
                        contractId: 'factory-2',
                        choice: 'AllocationFactory_Allocate',
                        choiceArgument: makeAllocationCommand(['cid-2']),
                    },
                    [dcShared],
                ])

            const specA = makeAllocationSpec({
                authorizer: makeAccount({ owner: 'alice::owner' }),
            })
            const specB = makeAllocationSpec({
                authorizer: makeAccount({ owner: 'bob::owner' }),
            })

            const registry = vi.fn().mockResolvedValue(registryUrl)

            const [commands, disclosed] =
                await service.createAllocationsForRequest({
                    requestCid: 'request-cid',
                    request: makeRequest([specA, specB]),
                    registry,
                })

            expect(commands).toHaveLength(3)
            expect(commands[0].contractId).toBe('factory-1')
            expect(commands[1].contractId).toBe('factory-2')
            expect(commands[2]).toMatchObject({
                templateId: ALLOCATION_REQUEST_INTERFACE_ID_V2,
                contractId: 'request-cid',
                choice: 'AllocationRequest_Accept',
            })

            expect(disclosed).toHaveLength(2)
            expect(disclosed.map((d) => d.contractId).sort()).toEqual([
                'disc-a',
                'disc-shared',
            ])
        })

        it('calls registry() once per allocation admin and createAllocation with that admin', async () => {
            const { service } = makeService()
            const registry = vi.fn().mockResolvedValue(registryUrl)

            vi.spyOn(service, 'createAllocation').mockResolvedValue([
                {
                    templateId: ALLOCATION_FACTORY_INTERFACE_ID_V2,
                    contractId: 'factory-1',
                    choice: 'AllocationFactory_Allocate',
                    choiceArgument: makeAllocationCommand([]),
                },
                [],
            ])

            const spec = makeAllocationSpec({ admin: 'custom-admin::123' })

            await service.createAllocationsForRequest({
                requestCid: 'request-cid',
                request: makeRequest([spec]),
                registry,
            })

            expect(registry).toHaveBeenCalledWith('custom-admin::123')
            expect(service.createAllocation).toHaveBeenCalledWith(
                expect.objectContaining({ admin: 'custom-admin::123', spec }),
                registryUrl
            )
        })

        it('uses explicit actors for the accept command when provided', async () => {
            const { service } = makeService()
            vi.spyOn(service, 'createAllocation').mockResolvedValue([
                {
                    templateId: ALLOCATION_FACTORY_INTERFACE_ID_V2,
                    contractId: 'factory-1',
                    choice: 'AllocationFactory_Allocate',
                    choiceArgument: makeAllocationCommand([]),
                },
                [],
            ])

            const spec = makeAllocationSpec({
                authorizer: makeAccount({ owner: '' }),
            })

            const [commands] = await service.createAllocationsForRequest({
                requestCid: 'request-cid',
                request: makeRequest([spec]),
                registry: vi.fn().mockResolvedValue(registryUrl),
                actors: ['explicit::actor'],
            })

            const accept = commands[commands.length - 1]
            expect(accept.choiceArgument).toMatchObject({
                actors: ['explicit::actor'],
            })
        })

        it('derives accept actors from the first authorizer owner when no actors are given', async () => {
            const { service } = makeService()
            vi.spyOn(service, 'createAllocation').mockResolvedValue([
                {
                    templateId: ALLOCATION_FACTORY_INTERFACE_ID_V2,
                    contractId: 'factory-1',
                    choice: 'AllocationFactory_Allocate',
                    choiceArgument: makeAllocationCommand([]),
                },
                [],
            ])

            const specA = makeAllocationSpec({
                authorizer: makeAccount({ owner: 'alice::owner' }),
            })
            const specB = makeAllocationSpec({
                authorizer: makeAccount({ owner: 'bob::owner' }),
            })

            const [commands] = await service.createAllocationsForRequest({
                requestCid: 'request-cid',
                request: makeRequest([specA, specB]),
                registry: vi.fn().mockResolvedValue(registryUrl),
            })

            const accept = commands[commands.length - 1]
            expect(accept.choiceArgument).toMatchObject({
                actors: ['alice::owner'],
            })
        })

        it('throws when no actors are given and no authorizer has an owner', async () => {
            const { service } = makeService()
            vi.spyOn(service, 'createAllocation').mockResolvedValue([
                {
                    templateId: ALLOCATION_FACTORY_INTERFACE_ID_V2,
                    contractId: 'factory-1',
                    choice: 'AllocationFactory_Allocate',
                    choiceArgument: makeAllocationCommand([]),
                },
                [],
            ])

            const spec = makeAllocationSpec({
                authorizer: makeAccount({ owner: '' }),
            })

            await expect(
                service.createAllocationsForRequest({
                    requestCid: 'request-cid',
                    request: makeRequest([spec]),
                    registry: vi.fn().mockResolvedValue(registryUrl),
                })
            ).rejects.toThrow(
                'Cannot accept allocation requests. No actors given and no authorizer has an owner'
            )
        })
    })
})
