// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, vi, beforeEach, expect } from 'vitest'
import * as mock from '../../__tests__/mocks'
import { TokenNamespace, type TokenNamespaceConfig } from './index'
import { ParsedURL } from '../utils/url'
/* oxlint-disable typescript/no-explicit-any */

const { ctx, mockLogger } = mock

const holdings = {
    nextOffset: 1025,
    transactions: [
        {
            updateId:
                '12203f58715e2095533cd7186a7e415b0a136080347be3f251f4a320746395ddba8c',
            offset: 1025,
            recordTime: '2026-06-17T14:03:02.113110Z',
            synchronizerId:
                'global-domain::1220d78a7ceb55b7e033856f64b9bab6c90792dcaec3d23b35bf71a87562737168fa',
            events: [
                {
                    label: {
                        burnAmount: '0',
                        mintAmount: '10000',
                        type: 'Mint',
                        tokenStandardChoice: null,
                        reason: 'tapped faucet',
                        meta: {
                            values: {},
                        },
                    },
                    lockedHoldingsChange: null,
                    lockedHoldingsChangeSummaries: [],
                    lockedHoldingsChangeSummary: null,
                    unlockedHoldingsChange: {
                        creates: [
                            {
                                amount: '10000.0000000000',
                                instrumentId: {
                                    admin: 'DSO::1220d78a7ceb55b7e033856f64b9bab6c90792dcaec3d23b35bf71a87562737168fa',
                                    id: 'Amulet',
                                },
                                contractId:
                                    '009923e16be4f29e301c01bdaf1b569ebc89ba9dd9df9b3f3c9f2f568088722058ca1212201dea1322a7c9093efbd378f723cb79d063d358a62ae20ee43902b5ee40831a2b',
                                owner: 'v1-01-alice::1220957a13a3785543ddc4d907a6c96666a717c154bc13273acbb73f52775274b626',
                                meta: {
                                    values: {
                                        'amulet.splice.lfdecentralizedtrust.org/created-in-round':
                                            '57',
                                        'amulet.splice.lfdecentralizedtrust.org/rate-per-round':
                                            '0.00380518',
                                    },
                                },
                                lock: null,
                            },
                        ],
                    },
                    unlockedHoldingsChangeSummaries: [
                        {
                            instrumentId: {
                                admin: 'DSO::1220d78a7ceb55b7e033856f64b9bab6c90792dcaec3d23b35bf71a87562737168fa',
                                id: 'Amulet',
                            },
                            numOutputs: 1,
                            outputAmount: '10000',
                            amountChange: '10000',
                        },
                    ],
                    unlockedHoldingsChangeSummary: {
                        instrumentId: {
                            admin: 'DSO::1220d78a7ceb55b7e033856f64b9bab6c90792dcaec3d23b35bf71a87562737168fa',
                            id: 'Amulet',
                        },
                        numOutputs: 1,
                        outputAmount: '10000',
                        amountChange: '10000',
                    },
                    transferInstruction: null,
                },
            ],
        },
    ],
}

const mockTokenStandard = {
    listHoldingTransactions: vi.fn(),
    getTransactionById: vi.fn(),
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

describe('token namespace', () => {
    let token: TokenNamespace

    beforeEach(() => {
        token = new TokenNamespace(config)
    })

    it('should get transactions by id', async () => {
        const tx = {
            updateId: '100',
            offset: 10,
            recordTime: 'time',
            synchronizerId: 'syncID::123',
            events: [],
        }
        vi.mocked(mockTokenStandard.getTransactionById).mockResolvedValue(tx)

        const result = await token.transactionsById({
            updateId: '100',
            partyId: 'alice::abc',
        })

        expect(result).toBe(tx)
    })

    it('list holdings', async () => {
        vi.mocked(mockTokenStandard.listHoldingTransactions).mockResolvedValue(
            holdings
        )

        const result = await token.holdings({
            partyId:
                'v1-01-alice::1220957a13a3785543ddc4d907a6c96666a717c154bc13273acbb73f52775274b626',
        })

        expect(result).toBe(holdings)
    })
})
