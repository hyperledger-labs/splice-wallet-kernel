// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, type MockedObject } from 'vitest'
import { TransferServiceV2 } from './transfer-service.js'
import type { CoreService } from '../core-service.js'
import { TokenStandardService } from '../token-standard-service.js'
import { EMPTY_META } from '../types.js'
import type { Logger } from '@canton-network/core-types'
import {
    type Account,
    type TransferFactory_Transfer as TransferFactory_TransferV2,
    type OffLedger as OffLedgerV2,
    TRANSFER_FACTORY_INTERFACE_ID_V2,
    TRANSFER_INSTRUCTION_INTERFACE_ID_V2,
} from '@canton-network/core-token-standard-v2'

type ChoiceContextV2 =
    OffLedgerV2.TransferInstructionV2.components['schemas']['ChoiceContext']

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
        getInputHoldingCidsForAccount: vi
            .fn()
            .mockResolvedValue(['cid1', 'cid2']),
        getTokenStandardClientV2: vi.fn().mockReturnValue(tokenClient),
    }

    const service = new TransferServiceV2(core as CoreService, mockLogger)

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

const senderAccount: Account = makeAccount()

const receiverAccount: Account = makeAccount({
    owner: 'bob::def',
    provider: 'provider::456',
})

const makeChoiceContext = (
    overrides: Partial<ChoiceContextV2> = {}
): ChoiceContextV2 => ({
    choiceContextData: {
        values: { ctx: 'data' } as Record<string, never>,
    },
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

describe('TransferServiceV2', () => {
    describe('buildTransferChoiceArgs', () => {
        it('builds transfer choice args with computed actors and defaults', async () => {
            const { service, core } = makeService()

            const result = await service.buildTransferChoiceArgs({
                sender: senderAccount,
                receiver: receiverAccount,
                amount: '50.0',
                instrumentAdmin,
                instrumentId,
            })

            expect(core.getInputHoldingCidsForAccount).toHaveBeenCalledWith({
                account: senderAccount,
                instrumentAdmin,
                instrumentId,
                inputUtxos: [],
                amount: expect.any(Object),
                continueUntilCompletion: false,
            })

            expect(result.actors).toEqual([
                senderAccount.owner,
                senderAccount.provider,
            ])
            expect(result.transfer.sender).toBe(senderAccount)
            expect(result.transfer.receiver).toBe(receiverAccount)
            expect(result.transfer.amount).toBe('50.0')
            expect(result.transfer.instrumentId).toEqual({
                admin: instrumentAdmin,
                id: instrumentId,
            })
            expect(result.transfer.inputHoldingCids).toEqual(['cid1', 'cid2'])
            expect(
                result.transfer.meta.values[TokenStandardService.MEMO_KEY]
            ).toBe('')
            expect(result.extraArgs).toEqual({
                context: { values: {} },
                meta: { values: {} },
            })
        })

        it('respects an explicit expiryDate for executeBefore', async () => {
            const { service } = makeService()
            const expiry = new Date('2030-01-01T00:00:00Z')

            const result = await service.buildTransferChoiceArgs({
                sender: senderAccount,
                receiver: receiverAccount,
                amount: '50.0',
                instrumentAdmin,
                instrumentId,
                expiryDate: expiry,
            })

            expect(result.transfer.executeBefore).toBe(expiry.toISOString())
        })

        it('defaults executeBefore to ~24h from now when no expiryDate is given', async () => {
            const { service } = makeService()
            const before = Date.now()

            const result = await service.buildTransferChoiceArgs({
                sender: senderAccount,
                receiver: receiverAccount,
                amount: '50.0',
                instrumentAdmin,
                instrumentId,
            })

            const executeBefore = new Date(
                result.transfer.executeBefore
            ).getTime()
            expect(executeBefore - before).toBeGreaterThan(23 * 60 * 60 * 1000)
            expect(executeBefore - before).toBeLessThan(25 * 60 * 60 * 1000)
        })

        it('includes memo in meta when provided', async () => {
            const { service } = makeService()

            const result = await service.buildTransferChoiceArgs({
                sender: senderAccount,
                receiver: receiverAccount,
                amount: '50.0',
                instrumentAdmin,
                instrumentId,
                memo: 'payment',
            })

            expect(
                result.transfer.meta.values[TokenStandardService.MEMO_KEY]
            ).toBe('payment')
        })

        it('merges caller-provided meta values alongside the memo key', async () => {
            const { service } = makeService()

            const result = await service.buildTransferChoiceArgs({
                sender: senderAccount,
                receiver: receiverAccount,
                amount: '50.0',
                instrumentAdmin,
                instrumentId,
                memo: 'payment',
                meta: { values: { extra: 'field' } },
            })

            expect(result.transfer.meta.values).toEqual({
                [TokenStandardService.MEMO_KEY]: 'payment',
                extra: 'field',
            })
        })

        it('uses explicit actors instead of deriving from sender when provided', async () => {
            const { service } = makeService()

            const result = await service.buildTransferChoiceArgs({
                sender: senderAccount,
                receiver: receiverAccount,
                amount: '50.0',
                instrumentAdmin,
                instrumentId,
                actors: ['custom::actor'],
            })

            expect(result.actors).toEqual(['custom::actor'])
        })

        it('drops null/undefined parts of the sender account when deriving actors', async () => {
            const { service } = makeService()

            const result = await service.buildTransferChoiceArgs({
                sender: makeAccount({ provider: undefined }),
                receiver: receiverAccount,
                amount: '50.0',
                instrumentAdmin,
                instrumentId,
            })

            expect(result.actors).toEqual([senderAccount.owner])
        })

        it('passes through inputUtxos and continueUntilCompletion', async () => {
            const { service, core } = makeService()

            await service.buildTransferChoiceArgs({
                sender: senderAccount,
                receiver: receiverAccount,
                amount: '50.0',
                instrumentAdmin,
                instrumentId,
                inputUtxos: ['utxo1'],
                continueUntilCompletion: true,
            })

            expect(core.getInputHoldingCidsForAccount).toHaveBeenCalledWith(
                expect.objectContaining({
                    inputUtxos: ['utxo1'],
                    continueUntilCompletion: true,
                })
            )
        })
    })

    describe('createTransfer', () => {
        const baseArgs = {
            sender: senderAccount,
            receiver: receiverAccount,
            amount: '10.0',
            instrumentAdmin,
            instrumentId,
        }

        it('uses prefetched context and does not make a registry call', async () => {
            const { service, tokenClient } = makeService()
            const ctx = makeChoiceContext()

            const [exercise] = await service.createTransfer(
                baseArgs,
                registryUrl,
                { factoryId: 'factory-id', choiceContext: ctx }
            )

            expect(tokenClient.post).not.toHaveBeenCalled()
            expect(exercise.contractId).toBe('factory-id')
            expect(exercise.choice).toBe('TransferFactory_Transfer')
        })

        it('makes a registry call when no prefetched context is provided', async () => {
            const { service, tokenClient } = makeService()
            const ctx = makeChoiceContext()
            tokenClient.post.mockResolvedValue({
                factoryId: 'factory-id',
                choiceContext: ctx,
            })

            const [exercise] = await service.createTransfer(
                baseArgs,
                registryUrl
            )

            expect(tokenClient.post).toHaveBeenCalledWith(
                '/registry/transfer-instruction/v2/transfer-factory',
                expect.objectContaining({
                    excludeDebugFields: true,
                    choiceArguments: expect.any(Object),
                })
            )
            expect(exercise.contractId).toBe('factory-id')
        })
    })

    describe('createTransferFromContext', () => {
        it('builds a TransferFactory_Transfer exercise and merges the choice context', async () => {
            const { service } = makeService()
            const choiceArgs: TransferFactory_TransferV2 = {
                actors: [senderAccount.owner],
                transfer: {
                    sender: senderAccount,
                    receiver: receiverAccount,
                    amount: '10.0',
                    instrumentId: { admin: instrumentAdmin, id: instrumentId },
                    requestedAt: new Date().toISOString(),
                    executeBefore: new Date().toISOString(),
                    inputHoldingCids: [],
                    meta: { values: {} },
                },
                extraArgs: { context: { values: {} }, meta: { values: {} } },
            }
            const ctx = makeChoiceContext()

            const [exercise, disclosedContracts] =
                await service.createTransferFromContext(
                    'factory-id',
                    choiceArgs,
                    ctx
                )

            expect(exercise.templateId).toBe(TRANSFER_FACTORY_INTERFACE_ID_V2)
            expect(exercise.contractId).toBe('factory-id')
            expect(exercise.choice).toBe('TransferFactory_Transfer')
            expect(
                (exercise.choiceArgument as TransferFactory_TransferV2)
                    .extraArgs.context
            ).toEqual({ values: { ctx: 'data' } })
            expect(disclosedContracts).toBe(ctx.disclosedContracts)
        })

        it('falls back to empty values when choiceContextData has none', async () => {
            const { service } = makeService()
            const choiceArgs: TransferFactory_TransferV2 = {
                actors: [senderAccount.owner],
                transfer: {
                    sender: senderAccount,
                    receiver: receiverAccount,
                    amount: '10.0',
                    instrumentId: { admin: instrumentAdmin, id: instrumentId },
                    requestedAt: new Date().toISOString(),
                    executeBefore: new Date().toISOString(),
                    inputHoldingCids: [],
                    meta: { values: {} },
                },
                extraArgs: { context: { values: {} }, meta: { values: {} } },
            }
            const ctx = makeChoiceContext({ choiceContextData: {} })

            const [exercise] = await service.createTransferFromContext(
                'factory-id',
                choiceArgs,
                ctx
            )

            expect(
                (exercise.choiceArgument as TransferFactory_TransferV2)
                    .extraArgs.context
            ).toEqual({ values: {} })
        })
    })

    describe('acceptTransferInstruction', () => {
        it('fetches the accept choice context and builds the exercise command', async () => {
            const { service, tokenClient } = makeService()
            const ctx = makeChoiceContext()
            tokenClient.post.mockResolvedValue(ctx)

            const [exercise, disclosedContracts] =
                await service.acceptTransferInstruction(
                    'transfer-instruction-cid',
                    ['actor::1'],
                    registryUrl
                )

            expect(tokenClient.post).toHaveBeenCalledWith(
                '/registry/transfer-instruction/v2/{transferInstructionId}/choice-contexts/accept',
                { excludeDebugFields: true },
                { path: { transferInstructionId: 'transfer-instruction-cid' } }
            )

            expect(exercise).toStrictEqual({
                templateId: TRANSFER_INSTRUCTION_INTERFACE_ID_V2,
                contractId: 'transfer-instruction-cid',
                choice: 'TransferInstruction_Accept',
                choiceArgument: {
                    actors: ['actor::1'],
                    extraArgs: {
                        context: ctx.choiceContextData,
                        meta: EMPTY_META,
                    },
                },
            })
            expect(disclosedContracts).toBe(ctx.disclosedContracts)
        })

        it('defaults disclosedContracts to an empty array when absent', async () => {
            const { service, tokenClient } = makeService()
            tokenClient.post.mockResolvedValue({
                choiceContextData: { values: {} },
            })

            const [, disclosedContracts] =
                await service.acceptTransferInstruction(
                    'transfer-instruction-cid',
                    ['actor::1'],
                    registryUrl
                )

            expect(disclosedContracts).toEqual([])
        })
    })

    describe('rejectTransferInstruction', () => {
        it('fetches the reject choice context and builds the exercise command', async () => {
            const { service, tokenClient } = makeService()
            const ctx = makeChoiceContext()
            tokenClient.post.mockResolvedValue(ctx)

            const [exercise, disclosedContracts] =
                await service.rejectTransferInstruction(
                    'transfer-instruction-cid2',
                    ['actor::1'],
                    registryUrl
                )

            expect(tokenClient.post).toHaveBeenCalledWith(
                '/registry/transfer-instruction/v2/{transferInstructionId}/choice-contexts/reject',
                { excludeDebugFields: true },
                { path: { transferInstructionId: 'transfer-instruction-cid2' } }
            )

            expect(exercise).toStrictEqual({
                templateId: TRANSFER_INSTRUCTION_INTERFACE_ID_V2,
                contractId: 'transfer-instruction-cid2',
                choice: 'TransferInstruction_Reject',
                choiceArgument: {
                    actors: ['actor::1'],
                    extraArgs: {
                        context: ctx.choiceContextData,
                        meta: EMPTY_META,
                    },
                },
            })
            expect(disclosedContracts).toBe(ctx.disclosedContracts)
        })
    })

    describe('withdrawTransferInstruction', () => {
        it('fetches the withdraw choice context and builds the exercise command', async () => {
            const { service, tokenClient } = makeService()
            const ctx = makeChoiceContext()
            tokenClient.post.mockResolvedValue(ctx)

            const [exercise, disclosedContracts] =
                await service.withdrawTransferInstruction(
                    'transfer-instruction-cid3',
                    ['actor::1'],
                    registryUrl
                )

            expect(tokenClient.post).toHaveBeenCalledWith(
                '/registry/transfer-instruction/v2/{transferInstructionId}/choice-contexts/withdraw',
                { excludeDebugFields: true },
                { path: { transferInstructionId: 'transfer-instruction-cid3' } }
            )

            expect(exercise).toStrictEqual({
                templateId: TRANSFER_INSTRUCTION_INTERFACE_ID_V2,
                contractId: 'transfer-instruction-cid3',
                choice: 'TransferInstruction_Withdraw',
                choiceArgument: {
                    actors: ['actor::1'],
                    extraArgs: {
                        context: ctx.choiceContextData,
                        meta: EMPTY_META,
                    },
                },
            })
            expect(disclosedContracts).toBe(ctx.disclosedContracts)
        })
    })
})
