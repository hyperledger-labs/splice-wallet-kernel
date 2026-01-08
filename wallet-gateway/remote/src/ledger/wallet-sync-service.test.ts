// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    jest,
    describe,
    it,
    expect,
    beforeEach,
    afterEach,
} from '@jest/globals'
import { pino, Logger } from 'pino'
import { sink } from 'pino-test'
import {
    SigningProvider,
    SigningDriverInterface,
    GetKeysResult,
} from '@canton-network/core-signing-lib'
import { InternalSigningDriver } from '@canton-network/core-signing-internal'
import { ParticipantSigningDriver } from '@canton-network/core-signing-participant'
import {
    StoreSql,
    connection,
    migrator,
} from '@canton-network/core-signing-store-sql'
import { AuthContext } from '@canton-network/core-wallet-auth'
import { LedgerClient } from '@canton-network/core-ledger-client'
import { Store } from '@canton-network/core-wallet-store'
import { WalletSyncService } from './wallet-sync-service.js'
import { PartyAllocationService } from './party-allocation-service.js'

type AsyncFn = () => Promise<unknown>

const mockLedgerGet = jest.fn<AsyncFn>()

jest.unstable_mockModule('@canton-network/core-ledger-client', () => ({
    LedgerClient: jest.fn().mockImplementation(() => {
        return {
            getWithRetry: mockLedgerGet,
        }
    }),
    defaultRetryableOptions: {},
}))

// Test subclass to expose protected method
class TestableWalletSyncService extends WalletSyncService {
    public async resolveSigningProvider(namespace: string) {
        return super.resolveSigningProvider(namespace)
    }
}

describe('WalletSyncService - resolveSigningProvider', () => {
    const authContext: AuthContext = {
        userId: 'test-user-id',
        accessToken: 'test-access-token',
    }

    let mockLogger: Logger
    let store: Store
    let ledgerClient: LedgerClient
    let partyAllocator: PartyAllocationService
    let service: TestableWalletSyncService

    beforeEach(async () => {
        mockLogger = pino(sink()) as Logger

        // Create in-memory SQLite store for InternalSigningDriver
        const db = connection({
            connection: {
                type: 'sqlite',
                database: ':memory:',
            },
        })
        const umzug = migrator(db)
        const pending = await umzug.pending()
        if (pending.length > 0) {
            await umzug.up()
        }
        const signingStore = new StoreSql(db, mockLogger, authContext)

        // Create real InternalSigningDriver with real store
        const internalDriver = new InternalSigningDriver(signingStore)

        // Store is not used in resolveSigningProvider tests
        store = {} as Store

        // Create real PartyAllocationService
        partyAllocator = new PartyAllocationService({
            synchronizerId: 'test-sync-id',
            accessTokenProvider: {
                getUserAccessToken: async () => 'user.jwt',
                getAdminAccessToken: async () => 'admin.jwt',
            },
            httpLedgerUrl: 'http://test',
            logger: mockLogger,
        })

        // Create mocked ledger client (whole module is already mocked)
        const ledgerModule = await import('@canton-network/core-ledger-client')
        ledgerClient = new ledgerModule.LedgerClient({
            baseUrl: new URL('http://test'),
            logger: mockLogger,
            accessTokenProvider: {
                getUserAccessToken: async () => 'token',
                getAdminAccessToken: async () => 'token',
            },
        })

        // Create service with real drivers
        service = new TestableWalletSyncService(
            store,
            ledgerClient,
            ledgerClient,
            authContext,
            mockLogger,
            {
                [SigningProvider.WALLET_KERNEL]: internalDriver,
                [SigningProvider.PARTICIPANT]: new ParticipantSigningDriver(),
            },
            partyAllocator
        )
    })

    afterEach(() => {
        jest.restoreAllMocks()
        mockLedgerGet.mockClear()
    })

    it('resolves participant when namespace matches participant namespace', async () => {
        const participantNamespace = 'participant-namespace-123'
        const participantId = `participant1::${participantNamespace}`
        mockLedgerGet.mockResolvedValueOnce({
            participantId,
        })

        const result =
            await service.resolveSigningProvider(participantNamespace)

        expect(result).not.toBeNull()
        expect(result).toEqual({
            signingProviderId: SigningProvider.PARTICIPANT,
        })
        if (result) {
            expect('publicKey' in result).toBe(false)
        }
    })

    it('resolves wallet-kernel when namespace matches internal key', async () => {
        const internalDriver = service['signingDrivers'][
            SigningProvider.WALLET_KERNEL
        ] as InternalSigningDriver
        const controller = internalDriver.controller(authContext.userId)
        const key = await controller.createKey({ name: 'test-key' })

        const namespace = partyAllocator.createFingerprintFromKey(key.publicKey)

        mockLedgerGet.mockResolvedValueOnce({
            participantId: 'participant1::different-participant-namespace',
        })

        const result = await service.resolveSigningProvider(namespace)

        expect(result).not.toBeNull()
        if (result) {
            expect(result.signingProviderId).toBe(SigningProvider.WALLET_KERNEL)
            if (result.signingProviderId !== SigningProvider.PARTICIPANT) {
                expect(result.publicKey).toBe(key.publicKey)
            }
        }
    })

    it('resolves fireblocks when namespace matches fireblocks key', async () => {
        const fireblocksPublicKeyHex =
            '02fefbcc9aebc8a479f211167a9f564df53aefd603a8662d9449a98c1ead2eba'

        // Convert hex to base64, then calculate namespace
        const normalizedKey = partyAllocator.normalizePublicKeyToBase64(
            fireblocksPublicKeyHex
        )
        const namespace = partyAllocator.createFingerprintFromKey(
            normalizedKey!
        )

        const mockFireblocksDriver = {
            controller: jest.fn().mockReturnValue({
                getKeys: jest
                    .fn<() => Promise<GetKeysResult>>()
                    .mockResolvedValue({
                        keys: [
                            {
                                id: '44-6767-1-0-0',
                                name: 'test-vault',
                                publicKey: fireblocksPublicKeyHex,
                            },
                        ],
                    }),
            }),
            partyMode: 'EXTERNAL' as const,
            signingProvider: SigningProvider.FIREBLOCKS,
        } as unknown as SigningDriverInterface

        const serviceWithFireblocks = new TestableWalletSyncService(
            store,
            ledgerClient,
            ledgerClient,
            authContext,
            mockLogger,
            {
                [SigningProvider.FIREBLOCKS]: mockFireblocksDriver,
            },
            partyAllocator
        )

        mockLedgerGet.mockResolvedValueOnce({
            participantId: 'participant1::different-participant-namespace',
        })

        const result =
            await serviceWithFireblocks.resolveSigningProvider(namespace)

        expect(result).not.toBeNull()
        if (result) {
            expect(result.signingProviderId).toBe(SigningProvider.FIREBLOCKS)
            if (result.signingProviderId !== SigningProvider.PARTICIPANT) {
                expect(result.publicKey).toBe(fireblocksPublicKeyHex)
            }
        }
    })

    it('returns null when no signing provider match is found', async () => {
        const unknownNamespace = 'unknown-namespace-123'
        mockLedgerGet.mockResolvedValueOnce({
            participantId: 'participant1::different-participant-namespace',
        })

        const result = await service.resolveSigningProvider(unknownNamespace)

        expect(result).toBeNull()
    })
})
