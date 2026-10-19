// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, vi, beforeEach, expect } from 'vitest'
import * as mock from '../../../../__tests__/mocks'
import type { TokenNamespaceConfig } from '../../index'
import { ParsedURL } from '../../../utils/url'
import { TransferNamespace } from './namespace'
import {
    type Account,
    TRANSFER_INSTRUCTION_INTERFACE_ID_V2,
} from '@canton-network/core-token-standard-v2'
import type { TransferParams } from '../../transfer/types'
import type { PartyId } from '@canton-network/core-types'

/* oxlint-disable typescript/no-explicit-any */
const { ctx, mockLogger } = mock

const mockTokenStandard = {
    listContractsByInterface: vi.fn(),
    registriesToAssets: vi.fn(),
    v2: {
        transfer: {
            acceptTransferInstruction: vi.fn(),
            rejectTransferInstruction: vi.fn(),
            withdrawTransferInstruction: vi.fn(),
            createTransfer: vi.fn(),
        },
    },
    core: {
        toBasicAccount(partyId: PartyId): Account {
            return {
                owner: partyId,
                provider: null,
                id: '',
            }
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

describe('token transfer namespace', () => {
    const mockCreateCommandResponse = [
        { ExerciseCommand: { choice: 'MockedChoice', contractId: 'cid1' } },
        ['mock-contract'],
    ]

    const registryUrl = new URL('http://registry.com')

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
            TRANSFER_INSTRUCTION_INTERFACE_ID_V2,
            'alice::abc'
        )
    })

    it('should create accept transfer instruction', async () => {
        const spy = mockTokenStandard.v2.transfer.acceptTransferInstruction
        spy.mockResolvedValue(mockCreateCommandResponse)
        await transfer.accept('cid-123', ['alice::abc'], registryUrl)
        expect(spy).toHaveBeenCalledExactlyOnceWith(
            'cid-123',
            ['alice::abc'],
            parsedRegistryUrl
        )
    })

    it('should create withdraw transfer instruction', async () => {
        const spy = mockTokenStandard.v2.transfer.withdrawTransferInstruction
        spy.mockResolvedValue(mockCreateCommandResponse)
        await transfer.withdraw('cid-123', ['alice::abc'], registryUrl)
        expect(spy).toHaveBeenCalledExactlyOnceWith(
            'cid-123',
            ['alice::abc'],
            parsedRegistryUrl
        )
    })

    it('should create reject transfer instruction', async () => {
        const spy = mockTokenStandard.v2.transfer.rejectTransferInstruction
        spy.mockResolvedValue(mockCreateCommandResponse)
        await transfer.reject('cid-123', ['alice::abc'], registryUrl)
        expect(spy).toHaveBeenCalledExactlyOnceWith(
            'cid-123',
            ['alice::abc'],
            parsedRegistryUrl
        )
    })

    it('should create transfer command', async () => {
        const spy1 = mockTokenStandard.registriesToAssets
        const spy2 = mockTokenStandard.v2.transfer.createTransfer
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
            {
                amount: defaultTransferParams.amount,
                instrumentAdmin: 'admin-a',
                instrumentId: 'Amulet',
                receiver: {
                    id: '',
                    owner: defaultTransferParams.recipient,
                    provider: null,
                },
                sender: {
                    id: '',
                    owner: defaultTransferParams.sender,
                    provider: null,
                },
            },
            parsedRegistryUrl
        )
    })
})
