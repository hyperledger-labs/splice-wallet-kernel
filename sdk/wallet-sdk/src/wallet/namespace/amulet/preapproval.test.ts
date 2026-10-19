// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, vi, beforeEach, expect, type Mock } from 'vitest'
import { PreapprovalNamespace } from './preapproval'
import { type AmuletNamespaceConfig, fetchAmulet } from './namespace'
import * as mock from '../../__tests__/mocks'
/* oxlint-disable typescript/no-explicit-any */
vi.mock('./namespace', () => ({
    fetchAmulet: vi.fn(),
}))

const { ctx, mockLogger } = mock

describe('PreapprovalNamespace', () => {
    let mockConfig: any
    let preapprovalNamespace: PreapprovalNamespace

    let mockSubmit: Mock

    beforeEach(() => {
        vi.useFakeTimers()

        mockLogger.child.mockImplementation(() => mockLogger)

        mockConfig = {
            commonCtx: ctx,
            validatorParty: 'mock-validator-party',
            amuletService: {
                cancelTransferPreapproval: vi.fn(),
                renewTransferPreapproval: vi.fn(),
                getTransferPreApprovalByParty: vi.fn(),
            },
        }

        preapprovalNamespace = new PreapprovalNamespace(
            mockConfig as AmuletNamespaceConfig
        )

        mockSubmit = vi.fn().mockResolvedValue({ updateId: 'tx-999' })
        ;(preapprovalNamespace as any).ledger = {
            internal: { submit: mockSubmit },
        }
    })

    it('should create the preapproval command', async () => {
        vi.mocked(fetchAmulet).mockResolvedValue({
            admin: 'dso::123',
            id: 'Amulet',
            displayName: 'Amulet',
            symbol: 'CC',
            registryUrl: new URL('http://registry:808'),
            capabilities: mock.capabilities,
        })

        const result = await preapprovalNamespace.command.create({
            parties: { receiver: 'receiver-party::123' },
        })

        expect(fetchAmulet).toHaveBeenCalledWith(mockConfig)
        expect(result).toStrictEqual({
            CreateCommand: {
                templateId:
                    '#splice-wallet:Splice.Wallet.TransferPreapproval:TransferPreapprovalProposal',
                createArguments: {
                    provider: 'mock-validator-party',
                    receiver: 'receiver-party::123',
                    expectedDso: 'dso::123',
                },
            },
        })
    })

    it('should cancel when the preapproval contract exists', async () => {
        const mockStatus = { contractId: 'cid-111', templateId: 'tid-222' }
        vi.spyOn(preapprovalNamespace, 'fetchStatus').mockResolvedValue(
            mockStatus as any
        )
        mockConfig.amuletService.cancelTransferPreapproval.mockResolvedValue([
            'cancel-exercise',
            ['dc-1'],
        ])

        const result = await preapprovalNamespace.command.cancel({
            parties: { receiver: 'receiver-party-abc' as any },
        })

        expect(
            mockConfig.amuletService.cancelTransferPreapproval
        ).toHaveBeenCalledWith('cid-111', 'tid-222', 'receiver-party-abc')
        expect(result).toStrictEqual([
            { ExerciseCommand: 'cancel-exercise' },
            ['dc-1'],
        ])
    })

    it('renew preapproval if the proper contracts exist', async () => {
        const expiresAt = new Date('2026-12-31')
        const mockStatus = {
            contractId: 'cid-old',
            templateId: 'tid-old',
            dso: 'dso::123',
            expiresAt: new Date('2026-06-15T00:00:00.000Z'),
        }
        vi.spyOn(preapprovalNamespace, 'fetchStatus').mockResolvedValue(
            mockStatus as any
        )
        mockConfig.amuletService.renewTransferPreapproval.mockResolvedValue([
            'renew-exercise',
            ['dc-renew'],
        ])

        const result = await preapprovalNamespace.renew({
            parties: {
                receiver: 'rec::123',
                provider: 'sender::123',
            },
            expiresAt: expiresAt,
            inputUtxos: ['utxo-1'],
            synchronizerId: 'sync::123',
        })

        expect(
            mockConfig.amuletService.renewTransferPreapproval
        ).toHaveBeenCalledWith(
            'cid-old',
            'tid-old',
            'sender::123',
            'sync::123',
            expiresAt,
            ['utxo-1']
        )
        expect(mockSubmit).toHaveBeenCalledWith({
            commands: [{ ExerciseCommand: 'renew-exercise' }],
            disclosedContracts: ['dc-renew'],
            synchronizerId: 'sync::123',
            actAs: ['sender::123'],
        })
        expect(result).toStrictEqual({ updateId: 'tx-999' })
    })

    it('fetch preapproval from amulet service with fetchQuick', async () => {
        mockConfig.amuletService.getTransferPreApprovalByParty.mockResolvedValue(
            { payload: 'data' }
        )

        const result = await preapprovalNamespace.fetchQuick(
            'preapprovalParty::123'
        )
        expect(result).toStrictEqual({ payload: 'data' })
        expect(
            mockConfig.amuletService.getTransferPreApprovalByParty
        ).toHaveBeenCalledOnce()
    })

    it('should convert error into preapproval no longer visible for fetchQuick', async () => {
        const error = {
            error: 'No TransferPreapproval found for party preapprovalParty::123',
        }
        mockConfig.amuletService.getTransferPreApprovalByParty.mockRejectedValue(
            error
        )

        const result = await preapprovalNamespace.fetchQuick(
            'preapprovalParty::123'
        )
        expect(result).toBeNull()
        expect(mockLogger.info).toHaveBeenCalledWith(
            'Preapproval is no longer visible'
        )
    })

    it('should fetch preapproval status with normal preapproval fetch', async () => {
        const preapproval = {
            contract: {
                contract_id: 'cid-found',
                template_id: 'tid-found',
                payload: {
                    dso: 'dso',
                    expiresAt: '2026-06-15T00:00:00.000Z',
                },
            },
        }
        mockConfig.amuletService.getTransferPreApprovalByParty.mockResolvedValue(
            preapproval
        )

        const result = await preapprovalNamespace.fetchStatus(
            'preapprovalParty::123'
        )

        expect(result).toStrictEqual({
            expiresAt: new Date('2026-06-15T00:00:00.000Z'),
            dso: 'dso',
            contractId: 'cid-found',
            templateId: 'tid-found',
        })
    })
})

describe('PreapprovalNamespace with no validator party', () => {
    let mockConfig: any
    let preapprovalNamespace: PreapprovalNamespace

    let mockSubmit: Mock

    beforeEach(() => {
        vi.resetAllMocks()
        vi.useFakeTimers()

        mockLogger.child.mockImplementation(() => mockLogger)

        mockConfig = {
            commonCtx: ctx,
            amuletService: {
                cancelTransferPreapproval: vi.fn(),
                renewTransferPreapproval: vi.fn(),
                getTransferPreApprovalByParty: vi.fn(),
            },
        }

        preapprovalNamespace = new PreapprovalNamespace(
            mockConfig as AmuletNamespaceConfig
        )

        mockSubmit = vi.fn().mockResolvedValue({ updateId: 'tx-999' })
        ;(preapprovalNamespace as any).ledger = {
            internal: { submit: mockSubmit },
        }
    })

    it('should create the preapproval command', async () => {
        vi.mocked(fetchAmulet).mockResolvedValue({
            admin: 'dso::123',
            id: 'Amulet',
            displayName: 'Amulet',
            symbol: 'CC',
            registryUrl: new URL('http://registry:808'),
            capabilities: mock.capabilities,
        })

        const result = await preapprovalNamespace.command.create({
            parties: {
                receiver: 'receiver-party::123',
                provider: 'validator::123',
            },
        })

        expect(fetchAmulet).toHaveBeenCalledWith(mockConfig)
        expect(result).toStrictEqual({
            CreateCommand: {
                templateId:
                    '#splice-wallet:Splice.Wallet.TransferPreapproval:TransferPreapprovalProposal',
                createArguments: {
                    provider: 'validator::123',
                    receiver: 'receiver-party::123',
                    expectedDso: 'dso::123',
                },
            },
        })
    })

    it('should create the preapproval command throw an error when no provider party is added', async () => {
        vi.mocked(fetchAmulet).mockResolvedValue({
            admin: 'dso::123',
            id: 'Amulet',
            displayName: 'Amulet',
            symbol: 'CC',
            registryUrl: new URL('http://registry:808'),
            capabilities: mock.capabilities,
        })

        await expect(
            preapprovalNamespace.command.create({
                parties: {
                    receiver: 'receiver-party::123',
                },
            })
        ).rejects.toThrow()
    })

    it('should cancel when the preapproval contract exists', async () => {
        const mockStatus = { contractId: 'cid-111', templateId: 'tid-222' }
        vi.spyOn(preapprovalNamespace, 'fetchStatus').mockResolvedValue(
            mockStatus as any
        )
        mockConfig.amuletService.cancelTransferPreapproval.mockResolvedValue([
            'cancel-exercise',
            ['dc-1'],
        ])

        const result = await preapprovalNamespace.command.cancel({
            parties: { receiver: 'receiver-party-abc' as any },
        })

        expect(
            mockConfig.amuletService.cancelTransferPreapproval
        ).toHaveBeenCalledWith('cid-111', 'tid-222', 'receiver-party-abc')
        expect(result).toStrictEqual([
            { ExerciseCommand: 'cancel-exercise' },
            ['dc-1'],
        ])
    })

    it('renew preapproval if the proper contracts exist', async () => {
        const expiresAt = new Date('2026-12-31')
        const mockStatus = {
            contractId: 'cid-old',
            templateId: 'tid-old',
            dso: 'dso::123',
            expiresAt: new Date('2026-06-15T00:00:00.000Z'),
        }
        vi.spyOn(preapprovalNamespace, 'fetchStatus').mockResolvedValue(
            mockStatus as any
        )
        mockConfig.amuletService.renewTransferPreapproval.mockResolvedValue([
            'renew-exercise',
            ['dc-renew'],
        ])

        const result = await preapprovalNamespace.renew({
            parties: {
                receiver: 'rec::123',
                provider: 'sender::123',
            },
            expiresAt: expiresAt,
            inputUtxos: ['utxo-1'],
            synchronizerId: 'sync::123',
        })

        expect(
            mockConfig.amuletService.renewTransferPreapproval
        ).toHaveBeenCalledWith(
            'cid-old',
            'tid-old',
            'sender::123',
            'sync::123',
            expiresAt,
            ['utxo-1']
        )
        expect(mockSubmit).toHaveBeenCalledWith({
            commands: [{ ExerciseCommand: 'renew-exercise' }],
            disclosedContracts: ['dc-renew'],
            synchronizerId: 'sync::123',
            actAs: ['sender::123'],
        })
        expect(result).toStrictEqual({ updateId: 'tx-999' })
    })

    it('throws an error on renew if provider party does not exist', async () => {
        const expiresAt = new Date('2026-12-31')
        const mockStatus = {
            contractId: 'cid-old',
            templateId: 'tid-old',
            dso: 'dso::123',
            expiresAt: new Date('2026-06-15T00:00:00.000Z'),
        }
        vi.spyOn(preapprovalNamespace, 'fetchStatus').mockResolvedValue(
            mockStatus as any
        )
        mockConfig.amuletService.renewTransferPreapproval.mockResolvedValue([
            'renew-exercise',
            ['dc-renew'],
        ])

        await expect(
            preapprovalNamespace.renew({
                parties: {
                    receiver: 'rec::123',
                },
                expiresAt: expiresAt,
                inputUtxos: ['utxo-1'],
                synchronizerId: 'sync::123',
            })
        ).rejects.toThrow()
    })
})
