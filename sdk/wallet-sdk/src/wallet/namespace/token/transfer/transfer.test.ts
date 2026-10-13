// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, vi, beforeEach, expect } from 'vitest'
import * as mock from '../../../__test__/mocks'
import type { TokenNamespaceConfig } from '../index'
import { ParsedURL } from '../../utils/url'
import { TransferNamespace } from './namespace'
import type { ProxyDelegationCommandArgs } from './proxyDelegation'
import { TRANSFER_INSTRUCTION_INTERFACE_ID } from '@canton-network/core-token-standard'
import type { TransferAllocationChoiceParams, TransferParams } from './types'
/* eslint-disable @typescript-eslint/no-explicit-any */
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

describe('token transfer namespace', () => {
    const mockCreateCommandResponse = [
        { ExerciseCommand: { choice: 'MockedChoice', contractId: 'cid1' } },
        ['mock-contract'],
    ]

    const registryUrl = new URL('http://registry.com')
    const defualtTransferAllocationParams: TransferAllocationChoiceParams = {
        transferInstructionCid: 'cid',
        registryUrl,
    }
    const defaultTransferParams: TransferParams = {
        sender: 'alice::abc',
        recipient: 'bob:def',
        amount: '100',
        instrumentId: 'Amulet',
        registryUrl,
    }
    const parsedRegistryUrl = new ParsedURL(ctx, registryUrl)

    let transfer: TransferNamespace
    beforeEach(() => {
        transfer = new TransferNamespace(config)
    })

    it('should list pending transfer instructions', async () => {
        const spy = mockTokenStandard.listContractsByInterface
        spy.mockResolvedValue([
            {
                contractId: 'cid',
                interfaceViewValue: '',
                activeContract: 'contract',
                fetchedAtOffset: 10,
            },
        ])

        await transfer.pending('alice::abc')
        expect(spy).toHaveBeenCalledExactlyOnceWith(
            TRANSFER_INSTRUCTION_INTERFACE_ID,
            'alice::abc'
        )
    })

    it('should create accept transfer instruction', async () => {
        const spy = mockTokenStandard.transfer.createAcceptTransferInstruction
        spy.mockResolvedValue(mockCreateCommandResponse)
        await transfer.accept(defualtTransferAllocationParams)
        expect(spy).toHaveBeenCalledExactlyOnceWith(
            defualtTransferAllocationParams.transferInstructionCid,
            parsedRegistryUrl
        )
    })

    it('should create withdraw transfer instruction', async () => {
        const spy = mockTokenStandard.transfer.createWithdrawTransferInstruction
        spy.mockResolvedValue(mockCreateCommandResponse)
        await transfer.withdraw(defualtTransferAllocationParams)
        expect(spy).toHaveBeenCalledExactlyOnceWith(
            defualtTransferAllocationParams.transferInstructionCid,
            parsedRegistryUrl
        )
    })

    it('should create reject transfer instruction', async () => {
        const spy = mockTokenStandard.transfer.createRejectTransferInstruction
        spy.mockResolvedValue(mockCreateCommandResponse)
        await transfer.reject(defualtTransferAllocationParams)
        expect(spy).toHaveBeenCalledExactlyOnceWith(
            defualtTransferAllocationParams.transferInstructionCid,
            parsedRegistryUrl
        )
    })

    it('should create transfer command', async () => {
        const spy1 = mockTokenStandard.registriesToAssets
        const spy2 = mockTokenStandard.transfer.createTransfer
        spy1.mockResolvedValue([
            {
                admin: 'admin-a',
                displayName: 'Amulet',
                id: 'Amulet',
                registryUrl: 'http://registry.com',
                symbol: 'CC',
            },
            {
                admin: 'admin-b',
                displayName: 'TestTokenExt',
                id: 'TestTokenExt',
                registryUrl: 'http://registry2.com',
                symbol: 'TestTokenExt',
            },
            {
                admin: 'admin-b',
                displayName: 'TestToken',
                id: 'TestToken',
                registryUrl: 'http://registry2.com',
                symbol: 'TestToken',
            },
        ])
        spy2.mockResolvedValue(mockCreateCommandResponse)
        await transfer.create(defaultTransferParams)
        expect(spy1).toHaveBeenCalledExactlyOnceWith([parsedRegistryUrl])
        expect(spy2).toHaveBeenCalledExactlyOnceWith(
            defaultTransferParams.sender,
            defaultTransferParams.recipient,
            defaultTransferParams.amount,
            'admin-a',
            'Amulet',
            parsedRegistryUrl,
            undefined,
            undefined,
            undefined,
            undefined
        )
    })

    const defaultProxyArgs: ProxyDelegationCommandArgs = {
        proxyCid: 'cid-123',
        transferInstructionCid: 'cid-456',
        featuredAppRight: {
            template_id: 'tid',
            contract_id: 'cid',
            payload: {},
            created_event_blob: 'test',
            created_at: 'createdat',
        },
        registryUrl: new URL('http://registry.com'),
    }

    it('should create proxy transfer instruction accept', async () => {
        const spy =
            mockTokenStandard.transfer
                .exerciseDelegateProxyTransferInstructionAccept

        spy.mockResolvedValue(mockCreateCommandResponse)
        await transfer.delegatedProxy.commands.accept(defaultProxyArgs)
        expect(spy).toHaveBeenCalledExactlyOnceWith(
            defaultProxyArgs.proxyCid,
            defaultProxyArgs.transferInstructionCid,
            new URL('http://registry.com'),
            'cid',
            [{ beneficiary: 'validatorParty::123', weight: 1 }]
        )
    })

    it('should create proxy transfer instruction reject', async () => {
        const spy =
            mockTokenStandard.transfer
                .exerciseDelegateProxyTransferInstructionReject

        spy.mockResolvedValue(mockCreateCommandResponse)
        await transfer.delegatedProxy.commands.reject(defaultProxyArgs)
        expect(spy).toHaveBeenCalledExactlyOnceWith(
            defaultProxyArgs.proxyCid,
            defaultProxyArgs.transferInstructionCid,
            new URL('http://registry.com'),
            'cid',
            [{ beneficiary: 'validatorParty::123', weight: 1 }]
        )
    })

    it('should create proxy transfer instruction withdraw', async () => {
        const spy =
            mockTokenStandard.transfer
                .exerciseDelegateProxyTransferInstructioWithdraw

        spy.mockResolvedValue(mockCreateCommandResponse)
        await transfer.delegatedProxy.commands.withdraw(defaultProxyArgs)
        expect(spy).toHaveBeenCalledExactlyOnceWith(
            defaultProxyArgs.proxyCid,
            defaultProxyArgs.transferInstructionCid,
            new URL('http://registry.com'),
            'cid',
            [{ beneficiary: 'validatorParty::123', weight: 1 }]
        )
    })

    it('should create and submit command', async () => {
        const delegateProxy = transfer.delegatedProxy

        const mockSubmit = vi.fn().mockResolvedValue({ updateId: 'tx-999' })
        ;(delegateProxy as any).ledger = {
            internal: { submit: mockSubmit },
        }
        const result = await delegateProxy.create('delegateParty::123')
        expect(result).toEqual({ updateId: 'tx-999' })
    })
})

describe('token transfer namespace no validatorURL', () => {
    let transfer: TransferNamespace
    beforeEach(() => {
        vi.resetAllMocks()
        transfer = new TransferNamespace({
            commonCtx: {
                ...ctx,
                defaultSynchronizerId: 'mock-synchronizer-id',
                logger: mockLogger,
            } as any,
            registryUrls: [new ParsedURL(ctx, 'http://registry.com')],
            tokenStandardService: mockTokenStandard as unknown as any,
        })
    })

    it('should create and submit command', async () => {
        const delegateProxy = transfer.delegatedProxy

        const mockSubmit = vi.fn().mockResolvedValue({ updateId: 'tx-999' })
        ;(delegateProxy as any).ledger = {
            internal: { submit: mockSubmit },
        }
        const result = await delegateProxy.create(
            'delegateParty::123',
            'validatorParty::123'
        )
        expect(result).toEqual({ updateId: 'tx-999' })
    })

    it('should throw an error if no validatorParty is provided', async () => {
        const delegateProxy = transfer.delegatedProxy
        await expect(
            delegateProxy.create('delegateParty::123')
        ).rejects.toThrow()
    })
})
