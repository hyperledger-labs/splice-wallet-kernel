// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { pino, type Logger } from 'pino'
import { sink } from 'pino-test'
import {
    SigningProvider,
    type SigningDriverInterface,
    type GetKeysResult,
} from '@canton-network/core-signing-lib'
import { InternalSigningDriver } from '@canton-network/core-signing-internal'
import { ParticipantSigningDriver } from '@canton-network/core-signing-participant'
import {
    StoreSql,
    connection,
    migrator,
} from '@canton-network/core-signing-store-sql'
import type {
    AccessTokenProvider,
    AuthContext,
} from '@canton-network/core-wallet-auth'
import type { LedgerClient } from '@canton-network/core-ledger-client'
import {
    type Wallet,
    type Network,
    type Store,
    PartyLevelRight,
    UserLevelRight,
    type WalletStatus,
} from '@canton-network/core-wallet-store'
import { StoreInternal } from '@canton-network/core-wallet-store-inmemory'
import { WALLET_DISABLED_REASON } from '@canton-network/core-types'
import { WalletSyncService } from './wallet-sync-service.js'
import { PartyAllocationService } from './party-allocation-service.js'
import { getLogger } from '@logtape/logtape'

type LedgerGet = (path: string, ...rest: unknown[]) => Promise<unknown>

const { mockLedgerGet } = vi.hoisted(() => ({
    mockLedgerGet: vi.fn<LedgerGet>(),
}))

function mockLedgerGets(responses: Record<string, unknown | (() => unknown)>) {
    mockLedgerGet.mockImplementation(async (path: string) => {
        if (!(path in responses)) {
            throw new Error(`No mocked response for GET ${path}`)
        }
        const response = responses[path]
        return typeof response === 'function' ? response() : response
    })
}

vi.mock('@canton-network/core-ledger-client', () => ({
    LedgerClient: vi.fn(function LedgerClientMock() {
        return {
            getWithRetry: mockLedgerGet,
        }
    }),
    defaultRetryableOptions: {},
    isJsCantonError: (error: unknown): error is { code: string } =>
        Boolean(error && typeof error === 'object' && 'code' in error),
}))

// Test subclass to expose protected method
class TestableWalletSyncService extends WalletSyncService {
    public async resolveSigningProvider(
        partyNamespace: string,
        participantNamespace: string
    ) {
        return super.resolveSigningProvider(
            partyNamespace,
            participantNamespace
        )
    }
}

const testATP = (user: string, token: string): AccessTokenProvider => ({
    getAccessToken: async () => token,
    getAuthContext: async () => ({
        userId: user,
        accessToken: token,
    }),
})

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
            accessTokenProvider: testATP('admin', 'admin.jwt'),
            httpLedgerUrl: 'http://test',
            logger: mockLogger,
        })

        // Create mocked ledger client (whole module is already mocked)
        const ledgerModule = await import('@canton-network/core-ledger-client')
        ledgerClient = new ledgerModule.LedgerClient({
            baseUrl: new URL('http://test'),
            logger: mockLogger,
            accessTokenProvider: testATP('token', 'token'),
        })

        // Create service with real drivers
        service = new TestableWalletSyncService(
            store,
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
        vi.restoreAllMocks()
        mockLedgerGet.mockClear()
    })

    it('resolves participant when namespace matches participant namespace', async () => {
        const participantNamespace = 'participant-namespace-123'

        const result = await service.resolveSigningProvider(
            participantNamespace,
            participantNamespace
        )

        expect(result).not.toBeNull()
        expect(result).toEqual({
            matched: true,
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

        if ('error' in key) {
            throw new Error(
                `Failed to create key in test: ${key.error_description}`
            )
        }

        const namespace = partyAllocator.createFingerprintFromKey(key.publicKey)

        const differentParticipantNamespace = 'different-participant-namespace'

        const result = await service.resolveSigningProvider(
            namespace,
            differentParticipantNamespace
        )

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
            controller: vi.fn().mockReturnValue({
                getKeys: vi
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
            authContext,
            mockLogger,
            {
                [SigningProvider.FIREBLOCKS]: mockFireblocksDriver,
            },
            partyAllocator
        )

        const differentParticipantNamespace = 'different-participant-namespace'

        const result = await serviceWithFireblocks.resolveSigningProvider(
            namespace,
            differentParticipantNamespace
        )

        expect(result).not.toBeNull()
        if (result) {
            expect(result.signingProviderId).toBe(SigningProvider.FIREBLOCKS)
            if (result.signingProviderId !== SigningProvider.PARTICIPANT) {
                expect(result.publicKey).toBe(fireblocksPublicKeyHex)
            }
        }
    })

    it('returns unmatched and defaults to participant when no signing provider match is found', async () => {
        const unknownNamespace = 'unknown-namespace-123'
        const differentParticipantNamespace = 'different-participant-namespace'

        const result = await service.resolveSigningProvider(
            unknownNamespace,
            differentParticipantNamespace
        )

        expect(result).toEqual({
            matched: false,
            signingProviderId: SigningProvider.PARTICIPANT,
        })
    })
})

describe('WalletSyncService - multi-network features', () => {
    const authContext: AuthContext = {
        userId: 'test-user-id',
        accessToken: 'test-access-token',
    }

    let mockLogger: Logger
    let store: StoreInternal
    let mockLedgerClient: LedgerClient
    let partyAllocator: PartyAllocationService
    let service: WalletSyncService
    const createNetwork = (id: string): Network => ({
        id,
        name: `Network ${id}`,
        synchronizerId: `${id}-sync`,
        identityProviderId: 'idp1',
        description: `Test Network ${id}`,
        ledgerApi: { baseUrl: `http://${id}` },
        auth: {
            method: 'authorization_code' as const,
            clientId: 'cid',
            scope: 'scope',
            audience: 'aud',
        },
    })

    const createWallet = (
        partyId: string,
        networkId: string,
        disabled = false,
        status: WalletStatus = 'allocated'
    ): Wallet => ({
        primary: false,
        partyId,
        status,
        hint: partyId.split('::')[0],
        signingProviderId: 'internal',
        publicKey: 'publicKey',
        namespace: 'namespace',
        networkId,
        userId: 'user-1',
        disabled,
        rights: [PartyLevelRight.CanActAs],
    })

    const setSession = async (networkId: string) => {
        await store.setSession({
            id: `sess-${networkId}`,
            origin: 'dapp-1',
            network: networkId,
            accessToken: 'test-access-token',
        })
    }

    beforeEach(async () => {
        mockLogger = pino(sink()) as Logger
        store = new StoreInternal(
            {
                idps: [],
                networks: [],
            },
            getLogger('mock'),
            authContext
        )

        // Add a default IdP that tests can use (use updateIdp to avoid errors if it already exists)
        try {
            await store.addIdp({
                id: 'idp1',
                type: 'oauth',
                issuer: 'http://auth',
                configUrl: 'http://auth/.well-known/openid-configuration',
            })
        } catch {
            // IdP might already exist from previous test, use updateIdp instead
            await store.updateIdp({
                id: 'idp1',
                type: 'oauth',
                issuer: 'http://auth',
                configUrl: 'http://auth/.well-known/openid-configuration',
            })
        }

        partyAllocator = new PartyAllocationService({
            synchronizerId: 'test-sync-id',
            accessTokenProvider: testATP('admin', 'admin.jwt'),
            httpLedgerUrl: 'http://test',
            logger: mockLogger,
        })

        const ledgerModule = await import('@canton-network/core-ledger-client')
        mockLedgerClient = new ledgerModule.LedgerClient({
            baseUrl: new URL('http://test'),
            logger: mockLogger,
            accessTokenProvider: testATP('token', 'token'),
        })

        service = new WalletSyncService(
            store,
            mockLedgerClient,
            authContext,
            mockLogger,
            {},
            partyAllocator
        )
    })

    afterEach(() => {
        vi.restoreAllMocks()
        mockLedgerGet.mockClear()
    })

    it('isWalletSyncNeeded should filter by current network', async () => {
        const network1 = createNetwork('network1')
        await store.addNetwork(network1)
        await setSession('network1')
        await store.addWallet(createWallet('party1::namespace', 'network1'))
        await store.addWallet(createWallet('party2::namespace', 'network2'))

        mockLedgerGets({
            '/v2/users/{user-id}/rights': {
                rights: [
                    {
                        kind: {
                            CanActAs: {
                                value: {
                                    party: 'party1::namespace',
                                },
                            },
                        },
                    },
                ],
            },
        })
        const syncNeeded = await service.isWalletSyncNeeded()

        // Should return false because party1 already exists in network1
        expect(syncNeeded).toBe(false)
    })

    it('isWalletSyncNeeded should detect new parties for current network only', async () => {
        const network1 = createNetwork('network1')
        await store.addNetwork(network1)
        await setSession('network1')

        mockLedgerGets({
            '/v2/users/{user-id}/rights': {
                rights: [
                    {
                        kind: {
                            CanActAs: {
                                value: {
                                    party: 'party1::namespace',
                                },
                            },
                        },
                    },
                ],
            },
        })
        const syncNeeded = await service.isWalletSyncNeeded()

        // Should return true because party1 exists on ledger but not in store for network1
        expect(syncNeeded).toBe(true)
    })

    it('syncWallets should only sync wallets for current network', async () => {
        const network1 = createNetwork('network1')
        await store.addNetwork(network1)
        await setSession('network1')
        await store.addWallet(createWallet('party1::namespace', 'network1'))
        const addWalletSpy = vi.spyOn(store, 'addWallet')

        mockLedgerGets({
            '/v2/parties/participant-id': {
                participantId: 'participant1::namespace',
            },
            '/v2/users/{user-id}/rights': {
                rights: [
                    {
                        kind: {
                            CanActAs: {
                                value: {
                                    party: 'party1::namespace',
                                },
                            },
                        },
                    },
                    {
                        kind: {
                            CanActAs: {
                                value: {
                                    party: 'party3::namespace',
                                },
                            },
                        },
                    },
                ],
            },
        })
        await service.syncWallets()

        // Should only add wallet for party3 (party1 already exists)
        const wallets = await store.getAllWallets({ networkIds: ['network1'] })
        expect(wallets.some((w) => w.partyId === 'party3::namespace')).toBe(
            true
        )
        expect(addWalletSpy).toHaveBeenCalled()
    })

    it('syncWallets should handle same party ID across different networks', async () => {
        const network1 = createNetwork('network1')
        await store.addNetwork(network1)
        await setSession('network1')

        // Mock ledger client to return rights for party1
        mockLedgerGets({
            '/v2/parties/participant-id': {
                participantId: 'participant1::namespace',
            },
            '/v2/users/{user-id}/rights': {
                rights: [
                    {
                        kind: {
                            CanActAs: {
                                value: {
                                    party: 'party1::namespace',
                                },
                            },
                        },
                    },
                ],
            },
        })
        await service.syncWallets()

        // Should add party1 for network1
        const wallets = await store.getAllWallets({ networkIds: ['network1'] })
        expect(wallets.some((w) => w.partyId === 'party1::namespace')).toBe(
            true
        )
    })

    it('isWalletSyncNeeded should detect multi-hosted party on different network', async () => {
        const network1 = createNetwork('network1')
        const network2 = createNetwork('network2')
        await store.addNetwork(network1)
        await store.addNetwork(network2)

        await store.addWallet(createWallet('party1::namespace', 'network1'))

        // Mock ledger client to return rights for party1 (multi-hosted party) for network1 check
        mockLedgerGets({
            '/v2/users/{user-id}/rights': {
                rights: [
                    {
                        kind: {
                            CanActAs: {
                                value: {
                                    party: 'party1::namespace',
                                },
                            },
                        },
                    },
                ],
            },
        })
        await setSession('network1')
        // Check sync needed for network1 (party already exists)
        const syncNeeded1 = await service.isWalletSyncNeeded()
        expect(syncNeeded1).toBe(false)

        // Mock ledger client to return rights for party1 for network2 check
        mockLedgerGets({
            '/v2/users/{user-id}/rights': {
                rights: [
                    {
                        kind: {
                            CanActAs: {
                                value: {
                                    party: 'party1::namespace',
                                },
                            },
                        },
                    },
                ],
            },
        })
        await setSession('network2')
        // Check sync needed for network2 (party doesn't exist yet)
        const syncNeeded2 = await service.isWalletSyncNeeded()
        expect(syncNeeded2).toBe(true)
    })

    it('syncWallets should handle multi-hosted party across networks', async () => {
        const network1 = createNetwork('network1')
        const network2 = createNetwork('network2')
        await store.addNetwork(network1)
        await store.addNetwork(network2)

        // Add wallet to network1 (simulating it was synced there previously)
        await setSession('network1')
        await store.addWallet(createWallet('party1::namespace', 'network1'))

        // Sync on network1 (party already exists, should not add)
        await setSession('network1')
        // Only need one mock since resolveSigningProvider won't be called if party already exists

        mockLedgerGets({
            '/v2/parties/participant-id': {
                participantId: 'participant1::namespace',
            },
            '/v2/users/{user-id}/rights': {
                rights: [
                    {
                        kind: {
                            CanActAs: {
                                value: {
                                    party: 'party1::namespace',
                                },
                            },
                        },
                    },
                ],
            },
        })
        const syncResult1 = await service.syncWallets()
        expect(syncResult1.added.length).toBe(0) // Should not add, already exists

        // Sync on network2 (party doesn't exist, should add)
        await setSession('network2')

        // Verify no wallets exist for network2 before sync
        const walletsBeforeSync = await store.getAllWallets({
            networkIds: ['network2'],
        })
        expect(walletsBeforeSync.length).toBe(0)

        mockLedgerGet.mockClear()
        mockLedgerGets({
            '/v2/parties/participant-id': {
                participantId: 'participant1::namespace',
            },
            '/v2/users/{user-id}/rights': {
                rights: [
                    {
                        kind: {
                            CanActAs: {
                                value: {
                                    party: 'party1::namespace',
                                },
                            },
                        },
                    },
                ],
            },
        })
        expect(mockLedgerGet).toHaveBeenCalledTimes(0)
        const syncResult = await service.syncWallets()

        expect(mockLedgerGet).toHaveBeenCalledTimes(2) // Once for rights, once for participantId
        expect(syncResult.added).toEqual(['party1::namespace'])

        const network2Wallets = await store.getAllWallets({
            networkIds: ['network2'],
        })
        const party1Wallet = network2Wallets.find(
            (w) => w.partyId === 'party1::namespace'
        )
        expect(party1Wallet).toBeDefined()
        expect(party1Wallet?.networkId).toBe('network2')
        expect(party1Wallet?.disabled).toBe(false)
    })

    describe('Wallet sync - handling wallet not having a party', () => {
        // When party is not on ledger (e.g. after participant reset), sync marks wallet
        // status as 'initialized' so the user can manually re-allocate each one with "Allocate" button

        it('isWalletSyncNeeded should return true when allocated wallet exists but has no party', async () => {
            const network1 = createNetwork('network1')
            await store.addNetwork(network1)
            await setSession('network1')
            await store.addWallet(
                createWallet(
                    'party1::namespace',
                    'network1',
                    undefined,
                    'allocated'
                )
            )
            await store.addWallet(
                createWallet(
                    'party2::namespace',
                    'network1',
                    undefined,
                    'allocated'
                )
            )

            mockLedgerGets({
                '/v2/users/{user-id}/rights': {
                    rights: [
                        {
                            kind: {
                                CanActAs: {
                                    value: {
                                        party: 'party2::namespace',
                                    },
                                },
                            },
                        },
                    ],
                },
            })
            const syncNeeded = await service.isWalletSyncNeeded()

            expect(syncNeeded).toBe(true)
        })

        it('isWalletSyncNeeded should return false when initialized wallet exists and has no party', async () => {
            const network1 = createNetwork('network1')
            await store.addNetwork(network1)
            await setSession('network1')
            await store.addWallet(
                createWallet(
                    'party1::namespace',
                    'network1',
                    undefined,
                    'initialized'
                )
            )
            await store.addWallet(
                createWallet(
                    'party2::namespace',
                    'network1',
                    undefined,
                    'allocated'
                )
            )

            mockLedgerGets({
                '/v2/users/{user-id}/rights': {
                    rights: [
                        {
                            kind: {
                                CanActAs: {
                                    value: {
                                        party: 'party2::namespace',
                                    },
                                },
                            },
                        },
                    ],
                },
            })
            const syncNeeded = await service.isWalletSyncNeeded()

            expect(syncNeeded).toBe(false)
        })

        it('syncWallets marks allocated wallet as initialized user has no rights to the party', async () => {
            const network1 = createNetwork('network1')
            await store.addNetwork(network1)
            await setSession('network1')
            await store.addWallet(createWallet('party1::namespace', 'network1'))

            mockLedgerGets({
                '/v2/parties/participant-id': {
                    participantId: 'participant1::namespace',
                },
                '/v2/users/{user-id}/rights': {
                    rights: [
                        {
                            kind: {
                                CanActAs: {
                                    value: { party: 'party2::namespace' },
                                },
                            },
                        },
                    ],
                },
            })
            const updateWalletSpy = vi.spyOn(store, 'updateWallet')

            const result = await service.syncWallets()

            expect(updateWalletSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    partyId: 'party1::namespace',
                    networkId: 'network1',
                    status: 'initialized',
                })
            )
            const wallets = await store.getWallets()
            const party1Wallet = wallets.find(
                (w) => w.partyId === 'party1::namespace'
            )
            expect(party1Wallet?.status).toBe('initialized')
            expect(result.added).toEqual(['party2::namespace'])
            expect(result.updated).toEqual(['party1::namespace'])
            expect(result.disabled).toEqual([])
        })

        it('syncWallets skips wallet when status is already initialized', async () => {
            const network1 = createNetwork('network1')
            await store.addNetwork(network1)
            await setSession('network1')
            const initializedWallet = createWallet(
                'party1::namespace',
                'network1',
                false,
                'initialized'
            )

            initializedWallet.rights = []
            await store.addWallet(initializedWallet)

            mockLedgerGets({
                '/v2/parties/participant-id': {
                    participantId: 'participant1::namespace',
                },
                '/v2/users/{user-id}/rights': {
                    rights: [
                        {
                            kind: {
                                CanActAs: {
                                    value: { party: 'party2::namespace' },
                                },
                            },
                        },
                    ],
                },
            })
            const updateWalletSpy = vi.spyOn(store, 'updateWallet')

            const result = await service.syncWallets()

            expect(updateWalletSpy).not.toHaveBeenCalled()
            const wallets = await store.getWallets()
            const party1Wallet = wallets.find(
                (w) => w.partyId === 'party1::namespace'
            )
            expect(party1Wallet?.status).toBe('initialized')
            expect(result.added).toEqual(['party2::namespace'])
            expect(result.disabled).toEqual([])
            expect(result.updated).toEqual([])
        })

        it('syncWallets marks multiple wallets as initialized when user has no rights to those parties', async () => {
            const network1 = createNetwork('network1')
            await store.addNetwork(network1)
            await setSession('network1')
            await store.addWallet(createWallet('party1::namespace', 'network1'))
            await store.addWallet(createWallet('party2::namespace', 'network1'))

            mockLedgerGets({
                '/v2/parties/participant-id': {
                    participantId: 'participant1::namespace',
                },
                '/v2/users/{user-id}/rights': {
                    rights: [
                        {
                            kind: {
                                CanActAs: {
                                    value: { party: 'party3::namespace' },
                                },
                            },
                        },
                    ],
                },
            })
            const updateWalletSpy = vi.spyOn(store, 'updateWallet')

            const result = await service.syncWallets()

            expect(updateWalletSpy).toHaveBeenCalledTimes(4)
            expect(updateWalletSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    partyId: 'party1::namespace',
                    networkId: 'network1',
                    status: 'initialized',
                })
            )
            expect(updateWalletSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    partyId: 'party2::namespace',
                    networkId: 'network1',
                    status: 'initialized',
                })
            )
            expect(updateWalletSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    partyId: 'party1::namespace',
                    networkId: 'network1',
                    rights: [],
                })
            )
            expect(updateWalletSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    partyId: 'party2::namespace',
                    networkId: 'network1',
                    rights: [],
                })
            )
            expect(result.added).toEqual(['party3::namespace'])
            expect(result.disabled).toEqual([])
            expect(result.updated).toEqual([
                'party1::namespace',
                'party2::namespace',
            ])
        })

        it('syncWallets disables participant wallet user has no rights to the party', async () => {
            const network1 = createNetwork('network1')
            await store.addNetwork(network1)
            await setSession('network1')
            const participantWallet = createWallet(
                'party1::namespace',
                'network1'
            )
            participantWallet.signingProviderId = SigningProvider.PARTICIPANT
            await store.addWallet(participantWallet)

            mockLedgerGets({
                '/v2/parties/participant-id': {
                    participantId: 'participant1::namespace',
                },
                '/v2/users/{user-id}/rights': {
                    rights: [
                        {
                            kind: {
                                CanActAs: {
                                    value: { party: 'party2::namespace' },
                                },
                            },
                        },
                    ],
                },
            })
            const updateWalletSpy = vi.spyOn(store, 'updateWallet')

            const result = await service.syncWallets()

            expect(updateWalletSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    partyId: 'party1::namespace',
                    networkId: 'network1',
                    disabled: true,
                    reason: 'participant namespace changed',
                })
            )
            const wallets = await store.getWallets()
            const party1Wallet = wallets.find(
                (w) => w.partyId === 'party1::namespace'
            )
            expect(party1Wallet?.disabled).toBe(true)
            expect(party1Wallet?.reason).toBe('participant namespace changed')
            expect(result.added).toEqual(['party2::namespace'])
            expect(result.updated).toEqual([])
            expect(result.disabled).toEqual(['party1::namespace'])
        })

        it('syncWallets reports proper changes while adding a wallet when there are disabled wallets', async () => {
            const network1 = createNetwork('network1')
            await store.addNetwork(network1)
            await setSession('network1')
            const disabledWallet = {
                ...createWallet('party1::namespace', 'network1', true),
                rights: [],
            }
            await store.addWallet(disabledWallet)

            mockLedgerGets({
                '/v2/parties/participant-id': {
                    participantId: 'participant1::namespace',
                },
                '/v2/users/{user-id}/rights': {
                    rights: [
                        {
                            kind: {
                                CanActAs: {
                                    value: { party: 'party2::namespace' },
                                },
                            },
                        },
                    ],
                },
            })
            const updateWalletSpy = vi.spyOn(store, 'updateWallet')
            const addWalletSpy = vi.spyOn(store, 'addWallet')

            const result = await service.syncWallets()

            expect(updateWalletSpy).not.toHaveBeenCalled()
            expect(addWalletSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    partyId: 'party2::namespace',
                    networkId: 'network1',
                    disabled: false,
                })
            )
            const wallets = await store.getWallets()
            const party1Wallet = wallets.find(
                (w) => w.partyId === 'party1::namespace'
            )
            expect(party1Wallet?.disabled).toBe(true)
            expect(result.added).toEqual(['party2::namespace'])
            expect(result.updated).toEqual([])
            expect(result.disabled).toEqual([])
        })

        it('syncWallets reports proper changes while adding a disabled wallet when there are disabled wallets', async () => {
            const network1 = createNetwork('network1')
            await store.addNetwork(network1)
            await setSession('network1')
            const disabledWallet = {
                ...createWallet(
                    'party1::unknown-namespace-123',
                    'network1',
                    true
                ),
                rights: [],
            }
            await store.addWallet(disabledWallet)

            mockLedgerGets({
                '/v2/parties/participant-id': {
                    participantId: 'participant1::namespace',
                },
                '/v2/users/{user-id}/rights': {
                    rights: [
                        {
                            kind: {
                                CanActAs: {
                                    value: {
                                        party: 'party2::unknown-namespace-123',
                                    },
                                },
                            },
                        },
                    ],
                },
            })
            const updateWalletSpy = vi.spyOn(store, 'updateWallet')
            const addWalletSpy = vi.spyOn(store, 'addWallet')

            const result = await service.syncWallets()

            expect(updateWalletSpy).not.toHaveBeenCalled()
            expect(addWalletSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    partyId: 'party2::unknown-namespace-123',
                    networkId: 'network1',
                    disabled: true,
                    reason: WALLET_DISABLED_REASON.NO_SIGNING_PROVIDER_MATCHED,
                })
            )
            const wallets = await store.getWallets()
            const party1Wallet = wallets.find(
                (w) => w.partyId === 'party2::unknown-namespace-123'
            )
            expect(party1Wallet?.disabled).toBe(true)
            expect(party1Wallet?.reason).toBe(
                WALLET_DISABLED_REASON.NO_SIGNING_PROVIDER_MATCHED
            )
            expect(result.added).toEqual([])
            expect(result.updated).toEqual([])
            expect(result.disabled).toEqual(['party2::unknown-namespace-123'])
        })
    })

    describe('Wallet sync - rights tracking', () => {
        it('isWalletSyncNeeded should return true when wallet rights changed on ledger', async () => {
            const network1 = createNetwork('network1')
            await store.addNetwork(network1)
            await setSession('network1')
            await store.addWallet({
                ...createWallet('party1::namespace', 'network1'),
                rights: [PartyLevelRight.CanActAs],
            })

            mockLedgerGets({
                '/v2/users/{user-id}/rights': {
                    rights: [
                        {
                            kind: {
                                CanReadAs: {
                                    value: {
                                        party: 'party1::namespace',
                                    },
                                },
                            },
                        },
                    ],
                },
            })
            const syncNeeded = await service.isWalletSyncNeeded()
            expect(syncNeeded).toBe(true)
        })

        it('syncWallets updates rights when they changed on ledger', async () => {
            const network1 = createNetwork('network1')
            await store.addNetwork(network1)
            await setSession('network1')
            await store.addWallet({
                ...createWallet('party1::namespace', 'network1'),
                rights: [PartyLevelRight.CanActAs],
            })
            await store.addWallet({
                ...createWallet('party3::namespace', 'network1'),
                rights: [PartyLevelRight.CanActAs],
            })

            mockLedgerGets({
                '/v2/parties/participant-id': {
                    participantId: 'participant1::namespace',
                },
                '/v2/users/{user-id}/rights': {
                    rights: [
                        {
                            kind: {
                                CanReadAs: {
                                    value: {
                                        party: 'party1::namespace',
                                    },
                                },
                            },
                        },
                        {
                            kind: {
                                CanActAs: {
                                    value: {
                                        party: 'party2::namespace',
                                    },
                                },
                            },
                        },
                    ],
                },
            })
            const result = await service.syncWallets()

            expect(result.updated).toEqual([
                'party3::namespace',
                'party1::namespace',
            ])
            const wallets = await store.getWallets()
            const updatedWallet = wallets.find(
                (w) => w.partyId === 'party1::namespace'
            )
            expect(updatedWallet?.rights).toEqual([PartyLevelRight.CanReadAs])
            expect(result.added).toEqual(['party2::namespace'])
        })

        it('syncWallets reports a reinitialized wallet once when its rights are also cleared', async () => {
            const network1 = createNetwork('network1')
            await store.addNetwork(network1)
            await setSession('network1')
            await store.addWallet({
                ...createWallet('party1::namespace', 'network1'),
                rights: [PartyLevelRight.CanActAs],
            })

            mockLedgerGets({
                '/v2/parties/participant-id': {
                    participantId: 'participant1::namespace',
                },
                '/v2/users/{user-id}/rights': {
                    rights: [
                        {
                            kind: {
                                CanActAs: {
                                    value: { party: 'party2::namespace' },
                                },
                            },
                        },
                    ],
                },
            })
            const result = await service.syncWallets()
            const wallets = await store.getWallets()

            expect(result.added).toEqual(['party2::namespace'])
            expect(result.disabled).toEqual([])
            expect(result.updated).toEqual(['party1::namespace'])
            expect(
                wallets.find((w) => w.partyId === 'party1::namespace')
            ).toMatchObject({
                status: 'initialized',
                rights: [],
            })
        })

        it('syncWallets does not create wallets from CanReadAsAnyParty alone', async () => {
            const network1 = createNetwork('network1')
            await store.addNetwork(network1)
            await setSession('network1')

            mockLedgerGets({
                '/v2/parties/participant-id': {
                    participantId: 'participant1::namespace',
                },
                '/v2/users/{user-id}/rights': {
                    rights: [
                        {
                            kind: {
                                CanReadAsAnyParty: {
                                    value: {},
                                },
                            },
                        },
                    ],
                },
            })
            const result = await service.syncWallets()
            expect(result.added).toHaveLength(0)
            expect((await store.getWallets()).length).toBe(0)
        })

        it('syncRights updates stored rights without syncing wallets', async () => {
            const network1 = createNetwork('network1')
            await store.addNetwork(network1)
            await setSession('network1')
            await store.addWallet({
                ...createWallet('party1::namespace', 'network1'),
                rights: [PartyLevelRight.CanActAs],
            })
            await store.addWallet({
                ...createWallet('party3::namespace', 'network1'),
                rights: [PartyLevelRight.CanActAs],
            })
            await store.addWallet({
                ...createWallet(
                    'party4::namespace',
                    'network1',
                    false,
                    'initialized'
                ),
                rights: [],
            })

            mockLedgerGets({
                '/v2/users/{user-id}/rights': {
                    rights: [
                        {
                            kind: {
                                CanReadAs: {
                                    value: {
                                        party: 'party1::namespace',
                                    },
                                },
                            },
                        },
                        {
                            kind: {
                                CanActAs: {
                                    value: {
                                        party: 'party2::namespace',
                                    },
                                },
                            },
                        },
                        {
                            kind: {
                                CanActAs: {
                                    value: {
                                        party: 'party4::namespace',
                                    },
                                },
                            },
                        },
                        {
                            kind: {
                                CanReadAsAnyParty: {
                                    value: {},
                                },
                            },
                        },
                    ],
                },
            })
            const updated = await service.syncRights()

            // party1 rights changed, party3 lost its rights and is cleared, without a status change.
            expect(updated.map((wallet) => wallet.partyId)).toEqual([
                'party1::namespace',
                'party3::namespace',
            ])
            expect(updated[0]).toMatchObject({
                rights: [PartyLevelRight.CanReadAs],
                status: 'allocated',
            })
            expect(updated[1]).toMatchObject({
                rights: [],
                status: 'allocated',
            })
            expect(mockLedgerGet).toHaveBeenCalledTimes(1)
            expect(mockLedgerGet).toHaveBeenCalledWith(
                '/v2/users/{user-id}/rights',
                expect.anything(),
                expect.objectContaining({
                    path: { 'user-id': 'test-user-id' },
                })
            )

            const wallets = await store.getWallets()
            // party2 is on the ledger but must not be created by rights sync.
            expect(wallets.map((w) => w.partyId).sort()).toEqual([
                'party1::namespace',
                'party3::namespace',
                'party4::namespace',
            ])
            expect(
                wallets.find((w) => w.partyId === 'party1::namespace')
            ).toMatchObject({
                primary: true,
                status: 'allocated',
                rights: [PartyLevelRight.CanReadAs],
            })
            // Party is absent from the snapshot, so stored rights are cleared. Status stays allocated.
            expect(
                wallets.find((w) => w.partyId === 'party3::namespace')
            ).toMatchObject({
                status: 'allocated',
                disabled: false,
                rights: [],
            })
            // Initialized wallets are skipped even if the ledger already has rights for that party.
            expect(
                wallets.find((w) => w.partyId === 'party4::namespace')
            ).toMatchObject({
                status: 'initialized',
                rights: [],
            })
            expect(await store.getUserRights(network1.id)).toEqual([
                UserLevelRight.CanReadAsAnyParty,
            ])
        })
    })

    describe('self-issued auth party', () => {
        const selfIssuedAuth = {
            method: 'self_issued' as const,
            audience: 'participant-aud',
            scope: 'daml_ledger_api',
        }

        const canActAs = (party: string) => ({
            kind: { CanActAs: { value: { party } } },
        })

        async function useSelfIssuedNetwork() {
            const network = {
                ...createNetwork('self-issued'),
                auth: selfIssuedAuth,
            }
            await store.addNetwork(network)
            await setSession(network.id)
            return network
        }

        it('syncWallets sets isAuthParty from the user primary party and clears it on the other wallets', async () => {
            await useSelfIssuedNetwork()
            await store.addWallet({
                ...createWallet('party1::namespace', 'self-issued'),
                isAuthParty: true,
            })
            await store.addWallet(
                createWallet('party2::namespace', 'self-issued')
            )
            await store.addWallet({
                ...createWallet('party3::namespace', 'other-network'),
                isAuthParty: true,
            })
            mockLedgerGets({
                '/v2/parties/participant-id': {
                    participantId: 'participant::namespace',
                },
                '/v2/users/{user-id}/rights': {
                    rights: [
                        canActAs('party1::namespace'),
                        canActAs('party2::namespace'),
                    ],
                },
                '/v2/users/{user-id}': {
                    user: {
                        id: 'test-user-id',
                        primaryParty: 'party2::namespace',
                        primaryPartyAuthentication: true,
                    },
                },
            })

            const result = await service.syncWallets()

            const wallets = await store.getWallets()
            expect(result.updated).toEqual([
                'party1::namespace',
                'party2::namespace',
            ])
            expect(result.added).toEqual([])
            expect(result.disabled).toEqual([])
            expect(
                wallets.find((wallet) => wallet.partyId === 'party1::namespace')
                    ?.isAuthParty
            ).toBe(false)
            expect(
                wallets.find((wallet) => wallet.partyId === 'party2::namespace')
                    ?.isAuthParty
            ).toBe(true)
            expect(
                (
                    await store.getAllWallets({
                        networkIds: ['other-network'],
                    })
                ).find((wallet) => wallet.partyId === 'party3::namespace')
                    ?.isAuthParty
            ).toBe(true)
        })

        it('syncWallets clears every auth-party flag when primary-party authentication is off', async () => {
            await useSelfIssuedNetwork()
            await store.addWallet({
                ...createWallet('party1::namespace', 'self-issued'),
                isAuthParty: true,
            })
            mockLedgerGets({
                '/v2/parties/participant-id': {
                    participantId: 'participant::namespace',
                },
                '/v2/users/{user-id}/rights': {
                    rights: [canActAs('party1::namespace')],
                },
                '/v2/users/{user-id}': {
                    user: {
                        id: 'test-user-id',
                        primaryParty: 'party1::namespace',
                        primaryPartyAuthentication: false,
                    },
                },
            })

            const result = await service.syncWallets()

            expect(result.updated).toEqual(['party1::namespace'])
            expect(
                (await store.getWallets()).every(
                    (wallet) => !wallet.isAuthParty
                )
            ).toBe(true)
        })

        it('syncWallets clears every auth-party flag when the ledger user does not exist', async () => {
            await useSelfIssuedNetwork()
            await store.addWallet({
                ...createWallet('party1::namespace', 'self-issued'),
                isAuthParty: true,
            })
            mockLedgerGets({
                '/v2/parties/participant-id': {
                    participantId: 'participant::namespace',
                },
                '/v2/users/{user-id}/rights': {
                    rights: [canActAs('party1::namespace')],
                },
                '/v2/users/{user-id}': () => {
                    throw { code: 'USER_NOT_FOUND' }
                },
            })

            const result = await service.syncWallets()

            expect(result.updated).toEqual(['party1::namespace'])
            expect(
                (await store.getWallets()).every(
                    (wallet) => !wallet.isAuthParty
                )
            ).toBe(true)
        })

        it('syncWallets does not read the ledger user when the network is not self-issued', async () => {
            const network1 = createNetwork('network1')
            await store.addNetwork(network1)
            await setSession('network1')
            mockLedgerGets({
                '/v2/parties/participant-id': {
                    participantId: 'participant::namespace',
                },
                '/v2/users/{user-id}/rights': { rights: [] },
            })
            await service.syncWallets()

            expect(
                mockLedgerGet.mock.calls.map((call: unknown[]) => call[0])
            ).not.toContain('/v2/users/{user-id}')
        })

        it('isWalletSyncNeeded is true when a self-issued auth-party flag disagrees with the ledger user', async () => {
            await useSelfIssuedNetwork()
            await store.addWallet(
                createWallet('party1::namespace', 'self-issued')
            )
            mockLedgerGets({
                '/v2/users/{user-id}/rights': {
                    rights: [canActAs('party1::namespace')],
                },
                '/v2/users/{user-id}': {
                    user: {
                        id: 'test-user-id',
                        primaryParty: 'party1::namespace',
                        primaryPartyAuthentication: true,
                    },
                },
            })

            // Rights already match. The missing isAuthParty flag is the only difference.
            await expect(service.isWalletSyncNeeded()).resolves.toBe(true)

            await store.setAuthPartyWallet('party1::namespace')
            await expect(service.isWalletSyncNeeded()).resolves.toBe(false)
        })

        it('syncAuthParty changes only the flag when that wallet is already stored', async () => {
            await useSelfIssuedNetwork()
            await store.addWallet(
                createWallet('party1::namespace', 'self-issued')
            )
            await store.addWallet({
                ...createWallet('party2::namespace', 'self-issued'),
                isAuthParty: true,
            })

            const wallet = await service.syncAuthParty('party1::namespace')

            expect(wallet?.partyId).toBe('party1::namespace')
            expect(wallet?.isAuthParty).toBe(true)
            expect(
                (await store.getWallets()).find(
                    (stored) => stored.partyId === 'party2::namespace'
                )?.isAuthParty
            ).toBe(false)
            // An existing row is not rediscovered, so signing providers are queried asked for keys again.
            expect(mockLedgerGet).not.toHaveBeenCalled()
        })

        it('syncAuthParty does nothing when the network is not self-issued', async () => {
            const network1 = createNetwork('network1')
            await store.addNetwork(network1)
            await setSession('network1')

            await expect(
                service.syncAuthParty('party1::namespace')
            ).resolves.toBeUndefined()
            expect(await store.getWallets()).toEqual([])
            expect(mockLedgerGet).not.toHaveBeenCalled()
        })

        it('syncAuthParty stores nothing for a participant-namespace party', async () => {
            await useSelfIssuedNetwork()
            mockLedgerGets({
                '/v2/parties/participant-id': {
                    participantId: 'participant::namespace',
                },
            })
            await expect(
                service.syncAuthParty('auth::namespace')
            ).resolves.toBeUndefined()
            expect(await store.getWallets()).toEqual([])
        })

        it('syncAuthParty stores nothing when no signing key matches, so a later call can try again', async () => {
            await useSelfIssuedNetwork()
            mockLedgerGets({
                '/v2/parties/participant-id': {
                    participantId: 'participant::namespace',
                },
            })
            await expect(
                service.syncAuthParty('auth::unmatched')
            ).resolves.toBeUndefined()
            // A disabled placeholder would hide the party from the next discovery.
            expect(await store.getWallets()).toEqual([])
            expect(mockLedgerGet).toHaveBeenCalledTimes(1)
        })

        it('syncAuthParty stores only the matched party and ignores other parties in the rights response', async () => {
            await useSelfIssuedNetwork()
            const publicKey = Buffer.alloc(32, 7).toString('base64')
            const namespace = partyAllocator.createFingerprintFromKey(publicKey)
            const partyId = `auth::${namespace}`
            const getKeys = vi.fn().mockResolvedValue({
                keys: [{ id: 'key-1', name: 'auth', publicKey }],
            })
            const matchedService = new WalletSyncService(
                store,
                mockLedgerClient,
                authContext,
                mockLogger,
                {
                    [SigningProvider.WALLET_KERNEL]: {
                        controller: () => ({ getKeys }),
                    },
                } as never,
                partyAllocator
            )
            mockLedgerGets({
                '/v2/parties/participant-id': {
                    participantId: 'participant::namespace',
                },
                '/v2/users/{user-id}/rights': {
                    rights: [
                        canActAs(partyId),
                        canActAs('other::someone-else'),
                    ],
                },
            })
            const wallet = await matchedService.syncAuthParty(partyId)

            expect(getKeys).toHaveBeenCalledOnce()
            expect(wallet).toMatchObject({
                partyId,
                status: 'allocated',
                signingProviderId: SigningProvider.WALLET_KERNEL,
                publicKey,
                isAuthParty: true,
                rights: [PartyLevelRight.CanActAs],
            })
            expect(await store.getWallets()).toEqual([
                expect.objectContaining({ partyId }),
            ])
        })
    })
})
