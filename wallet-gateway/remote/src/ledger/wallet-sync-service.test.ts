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
import {
    Wallet,
    Network,
    Store,
    WalletStatus,
} from '@canton-network/core-wallet-store'
import { StoreInternal } from '@canton-network/core-wallet-store-inmemory'
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

    it('returns unmatched na defaults ot participant when no signing provider match is found', async () => {
        const unknownNamespace = 'unknown-namespace-123'
        mockLedgerGet.mockResolvedValueOnce({
            participantId: 'participant1::different-participant-namespace',
        })

        const result = await service.resolveSigningProvider(unknownNamespace)

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
    let mockAdminLedgerClient: LedgerClient
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
        disabled,
    })

    const setSession = async (networkId: string) => {
        await store.setSession({
            id: `sess-${networkId}`,
            network: networkId,
            accessToken: 'token',
        })
    }

    beforeEach(async () => {
        mockLogger = pino(sink()) as Logger
        store = new StoreInternal(
            {
                idps: [],
                networks: [],
            },
            mockLogger,
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
            accessTokenProvider: {
                getUserAccessToken: async () => 'user.jwt',
                getAdminAccessToken: async () => 'admin.jwt',
            },
            httpLedgerUrl: 'http://test',
            logger: mockLogger,
        })

        const ledgerModule = await import('@canton-network/core-ledger-client')
        mockLedgerClient = new ledgerModule.LedgerClient({
            baseUrl: new URL('http://test'),
            logger: mockLogger,
            accessTokenProvider: {
                getUserAccessToken: async () => 'token',
                getAdminAccessToken: async () => 'token',
            },
        })
        mockAdminLedgerClient = new ledgerModule.LedgerClient({
            baseUrl: new URL('http://test'),
            logger: mockLogger,
            isAdmin: true,
            accessTokenProvider: {
                getUserAccessToken: async () => 'token',
                getAdminAccessToken: async () => 'token',
            },
        })

        service = new WalletSyncService(
            store,
            mockLedgerClient,
            mockAdminLedgerClient,
            authContext,
            mockLogger,
            {},
            partyAllocator
        )
    })

    afterEach(() => {
        jest.restoreAllMocks()
        mockLedgerGet.mockClear()
    })

    it('isWalletSyncNeeded should filter by current network', async () => {
        const network1 = createNetwork('network1')
        await store.addNetwork(network1)
        await setSession('network1')
        await store.addWallet(createWallet('party1::namespace', 'network1'))
        await store.addWallet(createWallet('party2::namespace', 'network2'))

        mockLedgerGet.mockResolvedValueOnce({
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
        })

        const syncNeeded = await service.isWalletSyncNeeded()

        // Should return false because party1 already exists in network1
        expect(syncNeeded).toBe(false)
    })

    it('isWalletSyncNeeded should detect new parties for current network only', async () => {
        const network1 = createNetwork('network1')
        await store.addNetwork(network1)
        await setSession('network1')

        mockLedgerGet.mockResolvedValueOnce({
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
        const addWalletSpy = jest.spyOn(store, 'addWallet')

        mockLedgerGet
            .mockResolvedValueOnce({
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
            })
            .mockResolvedValueOnce({
                participantId: 'participant1::namespace',
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
        mockLedgerGet
            .mockResolvedValueOnce({
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
            })
            .mockResolvedValueOnce({
                participantId: 'participant1::namespace',
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
        mockLedgerGet.mockResolvedValueOnce({
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
        })

        await setSession('network1')
        // Check sync needed for network1 (party already exists)
        const syncNeeded1 = await service.isWalletSyncNeeded()
        expect(syncNeeded1).toBe(false)

        // Mock ledger client to return rights for party1 for network2 check
        mockLedgerGet.mockResolvedValueOnce({
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
        mockLedgerGet.mockResolvedValueOnce({
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
        // First mock: getPartiesRightsMap calls ledgerClient.getWithRetry('/v2/users/{user-id}/rights')
        mockLedgerGet.mockResolvedValueOnce({
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
        })
        // Second mock: resolveSigningProvider calls adminLedgerClient.getWithRetry('/v2/parties/participant-id')
        mockLedgerGet.mockResolvedValueOnce({
            participantId: 'participant1::namespace',
        })

        expect(mockLedgerGet).toHaveBeenCalledTimes(0)
        const syncResult = await service.syncWallets()

        expect(mockLedgerGet).toHaveBeenCalledTimes(2) // Once for rights, once for participantId
        expect(syncResult.added.length).toBe(1)
        expect(syncResult.added[0].partyId).toBe('party1::namespace')
        expect(syncResult.added[0].networkId).toBe('network2')
        expect(syncResult.added[0].disabled).toBe(false)

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

            mockLedgerGet.mockResolvedValueOnce({
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

            mockLedgerGet.mockResolvedValueOnce({
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
            })

            const syncNeeded = await service.isWalletSyncNeeded()

            expect(syncNeeded).toBe(false)
        })

        it('syncWallets marks allocated wallet as initialized when party not on ledger', async () => {
            const network1 = createNetwork('network1')
            await store.addNetwork(network1)
            await setSession('network1')
            await store.addWallet(createWallet('party1::namespace', 'network1'))

            mockLedgerGet
                .mockResolvedValueOnce({
                    rights: [
                        {
                            kind: {
                                CanActAs: {
                                    value: { party: 'party2::namespace' },
                                },
                            },
                        },
                    ],
                })
                .mockResolvedValueOnce({
                    participantId: 'participant1::namespace',
                })

            const updateWalletSpy = jest.spyOn(store, 'updateWallet')

            await service.syncWallets()

            expect(updateWalletSpy).toHaveBeenCalledWith({
                partyId: 'party1::namespace',
                networkId: 'network1',
                status: 'initialized',
            })
            const wallets = await store.getWallets()
            const party1Wallet = wallets.find(
                (w) => w.partyId === 'party1::namespace'
            )
            expect(party1Wallet?.status).toBe('initialized')
        })

        it('syncWallets skips wallet when status is already initialized', async () => {
            const network1 = createNetwork('network1')
            await store.addNetwork(network1)
            await setSession('network1')
            const initializedWallet = createWallet(
                'party1::namespace',
                'network1'
            )
            initializedWallet.status = 'initialized'
            await store.addWallet(initializedWallet)

            mockLedgerGet
                .mockResolvedValueOnce({
                    rights: [
                        {
                            kind: {
                                CanActAs: {
                                    value: { party: 'party2::namespace' },
                                },
                            },
                        },
                    ],
                })
                .mockResolvedValueOnce({
                    participantId: 'participant1::namespace',
                })

            const updateWalletSpy = jest.spyOn(store, 'updateWallet')

            await service.syncWallets()

            expect(updateWalletSpy).not.toHaveBeenCalled()
            const wallets = await store.getWallets()
            const party1Wallet = wallets.find(
                (w) => w.partyId === 'party1::namespace'
            )
            expect(party1Wallet?.status).toBe('initialized')
        })

        it('syncWallets marks multiple wallets as initialized when parties not on ledger', async () => {
            const network1 = createNetwork('network1')
            await store.addNetwork(network1)
            await setSession('network1')
            await store.addWallet(createWallet('party1::namespace', 'network1'))
            await store.addWallet(createWallet('party2::namespace', 'network1'))

            mockLedgerGet
                .mockResolvedValueOnce({
                    rights: [
                        {
                            kind: {
                                CanActAs: {
                                    value: { party: 'party3::namespace' },
                                },
                            },
                        },
                    ],
                })
                .mockResolvedValueOnce({
                    participantId: 'participant1::namespace',
                })

            const updateWalletSpy = jest.spyOn(store, 'updateWallet')

            await service.syncWallets()

            expect(updateWalletSpy).toHaveBeenCalledTimes(2)
            expect(updateWalletSpy).toHaveBeenCalledWith({
                partyId: 'party1::namespace',
                networkId: 'network1',
                status: 'initialized',
            })
            expect(updateWalletSpy).toHaveBeenCalledWith({
                partyId: 'party2::namespace',
                networkId: 'network1',
                status: 'initialized',
            })
        })
    })
})
