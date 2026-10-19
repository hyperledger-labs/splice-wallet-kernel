// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, vi, beforeEach, expect, type Mock } from 'vitest'
import * as mock from '../../../__tests__/mocks'
import { TokenNamespace, type TokenNamespaceConfig } from '../index'
import { ParsedURL } from '../../utils/url'
import type { UtxoNamespace } from './service'
import { HOLDING_INTERFACE_ID } from '@canton-network/core-token-standard'
import type { MergeDelegationNamespace } from './mergeDelegation'

/* oxlint-disable typescript/no-explicit-any */
const { ctx, mockLogger } = mock

const mockTokenStandard = {
    listContractsByInterface: vi.fn(),
    registriesToAssets: vi.fn(),
    transfer: {
        createAcceptTransferInstruction: vi.fn(),
        createWithdrawTransferInstruction: vi.fn(),
        createRejectTransferInstruction: vi.fn(),
        createTransfer: vi.fn(),
        exerciseDelegateProxyTransferInstructionAccept: vi.fn(),
        exerciseDelegateProxyTransferInstructionReject: vi.fn(),
        exerciseDelegateProxyTransferInstructioWithdraw: vi.fn(),
    },
    isHoldingLocked: vi.fn(),
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

function makeUtxos(batchSize: number) {
    const utxos = []
    for (let i = 0; i < batchSize; i++) {
        const utxo = {
            contractId: crypto.randomUUID(),
            interfaceViewValue: {
                amount: '100',
                lock: null,
                instrumentId: {
                    id: 'Amulet',
                    admin: 'admin-a',
                },
            },
            activeContract: {
                createdEvent: {
                    templateId: 'tid',
                    contractId: 'cid',
                },
            },
            fetchedAtOffset: 10,
        }
        utxos.push(utxo)
    }

    return utxos
}

describe('utxos namespace', () => {
    let utxos: UtxoNamespace
    let delegatedMerge: MergeDelegationNamespace
    let mockSubmit: Mock
    beforeEach(() => {
        vi.resetAllMocks()
        utxos = new TokenNamespace(config).utxos
        delegatedMerge = utxos.delegatedMerge

        mockSubmit = vi.fn().mockResolvedValue({
            updateId: 'tx-123',
            completionOffset: '1000',
        })
        ;(delegatedMerge as any).ledger = { internal: { submit: mockSubmit } }
    })
    it('should list utxos for a current party', async () => {
        const spy = mockTokenStandard.listContractsByInterface
        spy.mockResolvedValue([
            {
                contractId: 'cid',
                interfaceViewValue: {
                    lock: null,
                },
                activeContract: 'contract',
                fetchedAtOffset: 10,
            },
        ])

        await utxos.list({
            partyId: 'alice::abc',
        })
        expect(spy).toHaveBeenCalledExactlyOnceWith(
            HOLDING_INTERFACE_ID,
            'alice::abc',
            undefined,
            undefined,
            undefined
        )
    })

    it('merge utxos', async () => {
        const inputUtxos = makeUtxos(100)

        const spy = mockTokenStandard.listContractsByInterface
        spy.mockResolvedValue(inputUtxos)
        const spy1 = mockTokenStandard.registriesToAssets

        const spy2 = mockTokenStandard.transfer.createTransfer
        const mockCreateCommandResponse = [
            { ExerciseCommand: { choice: 'MockedChoice', contractId: 'cid1' } },
            ['mock-contract'],
        ]

        spy1.mockResolvedValue([
            {
                admin: 'admin-a',
                displayName: 'Amulet',
                id: 'Amulet',
                registryUrl: 'http://registry.com',
                symbol: 'CC',
            },
        ])
        spy2.mockResolvedValue(mockCreateCommandResponse)

        await utxos.merge({
            partyId: 'alice::abc',
            inputUtxos: inputUtxos as any,
        })
    })

    describe('delegated merge utxos', async () => {
        it('should create command', async () => {
            const res = delegatedMerge.command.propose({
                owner: 'alice::abc',
            })
            expect(res).toStrictEqual({
                CreateCommand: {
                    createArguments: {
                        delegation: {
                            meta: {
                                values: {},
                            },
                            operator: 'validatorParty::123',
                            owner: 'alice::abc',
                        },
                    },
                    templateId:
                        '#splice-util-token-standard-wallet:Splice.Util.Token.Wallet.MergeDelegation:MergeDelegationProposal',
                },
            })
        })

        it('should set up the delegated merge', async () => {
            const result = await delegatedMerge.setup('syncId::123')
            expect(result).toStrictEqual({
                updateId: 'tx-123',
                completionOffset: '1000',
            })
            expect(mockSubmit).toHaveBeenCalledWith({
                commands: [
                    {
                        CreateCommand: {
                            createArguments: {
                                operator: 'validatorParty::123',
                            },
                            templateId:
                                '#splice-util-token-standard-wallet:Splice.Util.Token.Wallet.MergeDelegation:BatchMergeUtility',
                        },
                    },
                ],
                synchronizerId: 'syncId::123',
                actAs: ['validatorParty::123'],
            })
        })

        it('should approve a delegated merge', async () => {
            const mockReadJsContracts = vi.fn().mockResolvedValueOnce([
                {
                    templateId: 't-id',
                    contractId: 'cid-proposal-123',
                    createdEventBlob: 'test',
                    synchronizerId: 'syncId::123',
                    offset: 10,
                    nodeId: 1,
                    createArgument: undefined,
                    witnessParties: [],
                    signatories: [],
                    createdAt: '',
                    packageName: '',
                    representativePackageId: '',
                    acsDelta: false,
                },
            ])

            ;(delegatedMerge as any).ledger = {
                internal: { submit: mockSubmit },
                acsReader: {
                    readJsContracts: mockReadJsContracts,
                },
            }

            const result = await delegatedMerge.approve({
                owner: 'alice::abc',
                synchronizerId: 'syncId::123',
            })

            expect(mockReadJsContracts).toHaveBeenCalledWith({
                parties: ['alice::abc'],
                templateIds: [
                    '#splice-util-token-standard-wallet:Splice.Util.Token.Wallet.MergeDelegation:MergeDelegationProposal',
                ],
                filterByParty: true,
            })

            expect(mockSubmit).toHaveBeenCalledWith({
                commands: [
                    {
                        ExerciseCommand: {
                            templateId:
                                '#splice-util-token-standard-wallet:Splice.Util.Token.Wallet.MergeDelegation:MergeDelegationProposal',
                            contractId: 'cid-proposal-123',
                            choice: 'MergeDelegationProposal_Accept',
                            choiceArgument: {},
                        },
                    },
                ],
                disclosedContracts: expect.any(Array),
                synchronizerId: 'syncId::123',
                actAs: ['validatorParty::123'],
            })

            expect(result).toStrictEqual({
                updateId: 'tx-123',
                completionOffset: '1000',
            })
        })

        it('should execute a delegated merge', async () => {
            const inputUtxos = makeUtxos(50)
            const mockReadJsContracts = vi.fn().mockResolvedValue([
                {
                    templateId: 't-id',
                    contractId: 'cid-proposal-123',
                    createdEventBlob: 'test',
                    synchronizerId: 'syncId::123',
                    offset: 10,
                    nodeId: 1,
                    createArgument: undefined,
                    witnessParties: [],
                    signatories: [],
                    createdAt: '',
                    packageName: '',
                    representativePackageId: '',
                    acsDelta: false,
                },
            ])

            ;(delegatedMerge as any).ledger = {
                internal: { submit: mockSubmit },
                acsReader: {
                    readJsContracts: mockReadJsContracts,
                },
            }

            const spy1 = mockTokenStandard.registriesToAssets

            const spy2 = mockTokenStandard.transfer.createTransfer
            const mockCreateCommandResponse = [
                {
                    ExerciseCommand: {
                        choice: 'MockedChoice',
                        contractId: 'cid1',
                    },
                },
                ['mock-contract'],
            ]

            spy1.mockResolvedValue([
                {
                    admin: 'admin-a',
                    displayName: 'Amulet',
                    id: 'Amulet',
                    registryUrl: 'http://registry.com',
                    symbol: 'CC',
                },
            ])
            spy2.mockResolvedValue(mockCreateCommandResponse)

            const result = await delegatedMerge.execute({
                party: 'alice::abc',
                synchronizerId: 'syncId::123',
                inputUtxos: inputUtxos as any,
            })
            expect(mockTokenStandard.registriesToAssets).toHaveBeenCalled()
            expect(mockReadJsContracts).toHaveBeenCalledTimes(2)

            expect(result).toStrictEqual({
                updateId: 'tx-123',
                completionOffset: '1000',
            })
        })

        it('should throw an error if there are fewer than 10 utxos', async () => {
            const inputUtxos = makeUtxos(9)

            await expect(
                delegatedMerge.execute({
                    party: 'alice::abc',
                    synchronizerId: 'syncId::123',
                    inputUtxos: inputUtxos as any,
                })
            ).rejects.toThrow()
        })
    })
})

describe('delegated utxos merge namespace without validatorParty', () => {
    let utxos: UtxoNamespace
    let delegatedMerge: MergeDelegationNamespace
    let mockSubmit: Mock
    beforeEach(() => {
        vi.resetAllMocks()
        utxos = new TokenNamespace({
            commonCtx: {
                ...ctx,
                defaultSynchronizerId: 'mock-synchronizer-id',
                logger: mockLogger,
            } as any,
            registryUrls: [new ParsedURL(ctx, 'http://registry.com')],
            tokenStandardService: mockTokenStandard as unknown as any,
        }).utxos
        delegatedMerge = utxos.delegatedMerge

        mockSubmit = vi.fn().mockResolvedValue({
            updateId: 'tx-123',
            completionOffset: '1000',
        })
        ;(delegatedMerge as any).ledger = { internal: { submit: mockSubmit } }
    })

    describe('delegated merge utxos', async () => {
        it('should create command when party is supplied', async () => {
            const res = delegatedMerge.command.propose({
                owner: 'alice::abc',
                validatorParty: 'validatorParty::123',
            })
            expect(res).toStrictEqual({
                CreateCommand: {
                    createArguments: {
                        delegation: {
                            meta: {
                                values: {},
                            },
                            operator: 'validatorParty::123',
                            owner: 'alice::abc',
                        },
                    },
                    templateId:
                        '#splice-util-token-standard-wallet:Splice.Util.Token.Wallet.MergeDelegation:MergeDelegationProposal',
                },
            })
        })

        it('should set up the delegated merge when validatorParty is supplied', async () => {
            const result = await delegatedMerge.setup(
                'syncId::123',
                'validatorParty::123'
            )
            expect(result).toStrictEqual({
                updateId: 'tx-123',
                completionOffset: '1000',
            })
            expect(mockSubmit).toHaveBeenCalledWith({
                commands: [
                    {
                        CreateCommand: {
                            createArguments: {
                                operator: 'validatorParty::123',
                            },
                            templateId:
                                '#splice-util-token-standard-wallet:Splice.Util.Token.Wallet.MergeDelegation:BatchMergeUtility',
                        },
                    },
                ],
                synchronizerId: 'syncId::123',
                actAs: ['validatorParty::123'],
            })
        })

        it('should approve a delegated merge', async () => {
            const mockReadJsContracts = vi.fn().mockResolvedValueOnce([
                {
                    templateId: 't-id',
                    contractId: 'cid-proposal-123',
                    createdEventBlob: 'test',
                    synchronizerId: 'syncId::123',
                    offset: 10,
                    nodeId: 1,
                    createArgument: undefined,
                    witnessParties: [],
                    signatories: [],
                    createdAt: '',
                    packageName: '',
                    representativePackageId: '',
                    acsDelta: false,
                },
            ])

            ;(delegatedMerge as any).ledger = {
                internal: { submit: mockSubmit },
                acsReader: {
                    readJsContracts: mockReadJsContracts,
                },
            }

            const result = await delegatedMerge.approve({
                owner: 'alice::abc',
                synchronizerId: 'syncId::123',
                validatorParty: 'validatorParty::123',
            })

            expect(mockReadJsContracts).toHaveBeenCalledWith({
                parties: ['alice::abc'],
                templateIds: [
                    '#splice-util-token-standard-wallet:Splice.Util.Token.Wallet.MergeDelegation:MergeDelegationProposal',
                ],
                filterByParty: true,
            })

            expect(mockSubmit).toHaveBeenCalledWith({
                commands: [
                    {
                        ExerciseCommand: {
                            templateId:
                                '#splice-util-token-standard-wallet:Splice.Util.Token.Wallet.MergeDelegation:MergeDelegationProposal',
                            contractId: 'cid-proposal-123',
                            choice: 'MergeDelegationProposal_Accept',
                            choiceArgument: {},
                        },
                    },
                ],
                disclosedContracts: expect.any(Array),
                synchronizerId: 'syncId::123',
                actAs: ['validatorParty::123'],
            })

            expect(result).toStrictEqual({
                updateId: 'tx-123',
                completionOffset: '1000',
            })
        })

        it('should throw an error if there no validatorParty from the context or provided in the function', async () => {
            const inputUtxos = makeUtxos(11)

            await expect(
                delegatedMerge.execute({
                    party: 'alice::abc',
                    synchronizerId: 'syncId::123',
                    inputUtxos: inputUtxos as any,
                })
            ).rejects.toThrow()

            await expect(delegatedMerge.setup('syncId::123')).rejects.toThrow()

            await expect(
                delegatedMerge.approve({
                    owner: 'alice::abc',
                    synchronizerId: 'syncId::123',
                })
            ).rejects.toThrow()
        })
    })
})
