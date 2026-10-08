// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi } from 'vitest'
import { ledgerPrepareParams, logDynamically, networkStatus } from './utils'

import type { Logger } from 'pino'
import type { LedgerClient } from '@canton-network/core-ledger-client'

const mockLevelEnabled = vi.fn(() => false)

export const createTestLogger = (): Logger => {
    return {
        info: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        child: vi.fn(() => createTestLogger()),
        isLevelEnabled: mockLevelEnabled,
    } as unknown as Logger
}

describe('utils', () => {
    it('should call ledgerPrepareParams', () => {
        const result = ledgerPrepareParams({
            userId: 'alice',
            partyIds: ['alice'],
            synchronizerId: 'sync1',
            params: {
                disclosedContracts: [
                    {
                        templateId: 'mock-template-id',
                        contractId: 'mock-contract-id',
                        createdEventBlob: 'mock-created-event-blob',
                        synchronizerId: 'mock-synchronizer-id',
                    },
                ],
            },
            hashingSchemeVersion: 'HASHING_SCHEME_VERSION_V2',
        })
        expect(result).toBeDefined()
    })

    describe('logDynamically', () => {
        it('should log correctly', () => {
            const logger = createTestLogger()
            const msg = 'test message'
            const data = {
                info: { key: 'value' },
                debug: { debugKey: 'debugValue' },
            }

            mockLevelEnabled.mockReturnValueOnce(true)
            logDynamically(logger, msg, data)

            expect(logger.debug).toHaveBeenCalledWith(
                { ...data.info, ...data.debug },
                msg
            )

            logDynamically(logger, msg, data)

            expect(logger.info).toHaveBeenCalledWith(data.info, msg)
        })

        it('should log correctly without extra data info', () => {
            const logger = createTestLogger()
            const msg = 'test message'

            logDynamically(logger, msg, { debug: { key: 'value' } })

            expect(logger.info).toHaveBeenCalledWith(msg)
        })
    })

    describe('networkStatus', () => {
        it('should return the network status', async () => {
            const client = {
                get: vi.fn().mockResolvedValueOnce({
                    version: 'mock-canton-version',
                }),
            } as unknown as LedgerClient

            const status = await networkStatus(client)
            expect(status).toEqual({
                isConnected: true,
                cantonVersion: 'mock-canton-version',
            })
        })

        it('should return the network status as disconnected on error', async () => {
            const client = {
                get: vi.fn().mockThrowOnce(new Error('mock error')),
            } as unknown as LedgerClient

            const status = await networkStatus(client)
            expect(status).toEqual({
                isConnected: false,
                reason: `Ledger unreachable: mock error`,
            })
        })
    })
})
