// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { pino, type Logger } from 'pino'
import { sink } from 'pino-test'
import type { AuthContext, Idp } from '@canton-network/core-wallet-auth'
import {
    type MessageRaw,
    type Network as StoreNetwork,
    PartyLevelRight,
    type Session,
    type Transaction,
    type Wallet,
} from '@canton-network/core-wallet-store'
import { StoreInternal } from '@canton-network/core-wallet-store-inmemory'
import { SigningProvider } from '@canton-network/core-signing-lib'
import type { KernelInfo } from '../config/Config.js'
import { NotificationService } from '@canton-network/core-wallet-services'
import { userController } from './controller.js'
import { getLogger } from '@logtape/logtape'

const ledgerMocks = vi.hoisted(() => ({
    get: vi.fn(),
    getWithRetry: vi.fn(),
    postWithRetry: vi.fn(),
    getSynchronizerId: vi.fn(),
}))

const mockNetworkStatus = vi.hoisted(() =>
    vi.fn().mockResolvedValue({
        isConnected: true,
        reason: undefined,
        cantonVersion: '3.4',
    } as {
        isConnected: boolean
        reason?: string
        cantonVersion?: string
    })
)

const walletAllocationMocks = vi.hoisted(() => ({
    createWallet: vi.fn(),
    allocateParty: vi.fn(),
}))

const walletSyncMocks = vi.hoisted(() => ({
    syncWallets: vi.fn().mockResolvedValue({
        added: [],
        updated: [],
        disabled: [],
    }),
    syncRights: vi.fn().mockResolvedValue([]),
    isWalletSyncNeeded: vi.fn().mockResolvedValue(false),
}))

const transactionServiceMocks = vi.hoisted(() => ({
    sign: vi.fn(),
    execute: vi.fn(),
}))

const mockV4 = vi.hoisted(() => vi.fn(() => crypto.randomUUID()))

vi.mock('uuid', async (importOriginal) => {
    const actual = await importOriginal<typeof import('uuid')>()
    return { ...actual, v4: mockV4 }
})

vi.mock('@canton-network/core-ledger-client', async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import('@canton-network/core-ledger-client')
        >()
    return {
        ...actual,
        LedgerClient: vi.fn(function LedgerClientMock() {
            return {
                get: ledgerMocks.get,
                getWithRetry: ledgerMocks.getWithRetry,
                postWithRetry: ledgerMocks.postWithRetry,
                getSynchronizerId: ledgerMocks.getSynchronizerId,
            }
        }),
    }
})

vi.mock('@canton-network/core-wallet-services', async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import('@canton-network/core-wallet-services')
        >()
    return {
        ...actual,
        networkStatus: mockNetworkStatus,
        TransactionService: vi.fn(function TransactionServiceMock() {
            return transactionServiceMocks
        }),
    }
})

vi.mock('../ledger/wallet-allocation/wallet-allocation-service.js', () => ({
    WalletAllocationService: vi.fn(function WalletAllocationServiceMock() {
        return walletAllocationMocks
    }),
}))

vi.mock('../ledger/wallet-sync-service.js', () => ({
    WalletSyncService: vi.fn(function WalletSyncServiceMock() {
        return walletSyncMocks
    }),
}))

vi.mock('../ledger/party-allocation-service.js', () => ({
    PartyAllocationService: vi.fn(),
}))

const kernelInfo: KernelInfo = {
    id: 'kernel-test',
    clientType: 'browser',
}

const userUrl = 'https://user.example'

const regularUserId = 'user-1'
const adminUserId = 'admin-user'

const idp: Idp = {
    id: 'idp1',
    type: 'oauth',
    issuer: 'http://auth',
    configUrl: 'http://auth/.well-known/openid-configuration',
}

const storeNetwork: StoreNetwork = {
    id: 'network1',
    name: 'testnet',
    synchronizerId: 'sync1::fingerprint',
    description: 'Test',
    identityProviderId: 'idp1',
    ledgerApi: { baseUrl: 'http://ledger.test' },
    auth: {
        method: 'authorization_code',
        clientId: 'cid',
        scope: 'scope1 scope2',
        audience: 'aud',
    },
    adminAuth: {
        method: 'client_credentials',
        clientId: 'admin-cid',
        clientSecret: 'admin-secret',
        audience: 'admin-aud',
        scope: 'admin-scope',
    },
}

const auth: AuthContext = {
    userId: regularUserId,
    accessToken: 'access-token-1',
}

const adminAuth: AuthContext = {
    userId: adminUserId,
    accessToken: 'admin-access-token',
}

const session: Session = {
    id: 'session-1',
    origin: 'dapp-1',
    network: 'network1',
    accessToken: 'access-token-1',
}

const pendingTransaction: Transaction = {
    id: 'tx-1',
    commandId: 'cmd-1',
    status: 'pending',
    preparedTransaction: 'blob',
    preparedTransactionHash: 'hash',
    origin: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
}

const primaryWallet: Wallet = {
    primary: true,
    partyId: 'party::namespace',
    status: 'allocated',
    hint: 'party',
    signingProviderId: SigningProvider.WALLET_KERNEL,
    publicKey: 'wallet-public-key',
    namespace: 'namespace',
    networkId: 'network1',
    userId: 'user-1',
    rights: [PartyLevelRight.CanActAs],
}

const participantWallet: Wallet = {
    ...primaryWallet,
    partyId: 'party::participant',
    signingProviderId: SigningProvider.PARTICIPANT,
}

async function createStore(
    logger: Logger,
    context: AuthContext | undefined,
    options: { withSession?: boolean; withWallet?: boolean } = {}
): Promise<StoreInternal> {
    const { withSession = true, withWallet = true } = options
    const store = new StoreInternal(
        { idps: [idp], networks: [storeNetwork] },
        getLogger('mock'),
        context
    )
    if (context && withSession) {
        await store.setSession(session)
    }
    if (context && withWallet) {
        await store.addWallet(primaryWallet)
    }
    return store
}

function createController(
    store: StoreInternal,
    notificationService: NotificationService,
    logger: Logger,
    context: AuthContext | undefined,
    drivers: Record<string, unknown> = {},
    adminId?: string
) {
    return userController(
        kernelInfo,
        userUrl,
        store,
        notificationService,
        context,
        drivers,
        logger,
        'HASHING_SCHEME_VERSION_V3',
        adminId
    )
}

describe('userController', () => {
    let logger: Logger
    let notificationService: NotificationService

    beforeEach(() => {
        logger = pino({ level: 'silent' }, sink())
        notificationService = new NotificationService(logger)
        ledgerMocks.get.mockReset()
        ledgerMocks.get.mockRejectedValue({
            code: 'USER_NOT_FOUND',
            cause: 'missing',
            errorCategory: 11,
        })
        ledgerMocks.getWithRetry.mockReset()
        ledgerMocks.getWithRetry.mockResolvedValue({ rights: [] })
        ledgerMocks.postWithRetry.mockReset()
        ledgerMocks.getSynchronizerId.mockReset()
        mockNetworkStatus.mockReset()
        mockNetworkStatus.mockResolvedValue({
            isConnected: true,
            reason: undefined,
            cantonVersion: '3.4',
        })
        walletAllocationMocks.createWallet.mockReset()
        walletAllocationMocks.allocateParty.mockReset()
        walletSyncMocks.syncWallets.mockReset()
        walletSyncMocks.syncWallets.mockResolvedValue({
            added: [],
            updated: [],
            disabled: [],
        })
        walletSyncMocks.syncRights.mockReset()
        walletSyncMocks.syncRights.mockResolvedValue([])
        walletSyncMocks.isWalletSyncNeeded.mockReset()
        walletSyncMocks.isWalletSyncNeeded.mockResolvedValue(false)
        transactionServiceMocks.sign.mockReset()
        transactionServiceMocks.execute.mockReset()
    })

    describe('addSelfIssuedSession', () => {
        it('creates a tokenless session for the username and network', async () => {
            const selfIssuedNetwork = {
                ...storeNetwork,
                id: 'self-issued-network',
                auth: { method: 'self_issued' },
            } as unknown as StoreNetwork
            const store = new StoreInternal(
                { idps: [idp], networks: [selfIssuedNetwork] },
                getLogger('mock')
            )
            const controller = createController(
                store,
                notificationService,
                logger,
                undefined
            )

            const { sessionId } = await controller.addSelfIssuedSession({
                username: 'alice',
                networkId: selfIssuedNetwork.id,
                origin: 'https://example.com',
            })

            await expect(
                store.getOnboardingSession(sessionId)
            ).resolves.toEqual(
                expect.objectContaining({
                    id: sessionId,
                    origin: 'https://example.com',
                    network: selfIssuedNetwork.id,
                    userId: 'alice',
                })
            )
            const onboardingStore = store.withAuthContext({
                userId: 'alice',
                accessToken: '',
                sessionId,
            })
            await expect(onboardingStore.getCurrentNetwork()).resolves.toEqual(
                selfIssuedNetwork
            )
            await expect(
                store
                    .withAuthContext({ userId: 'alice', accessToken: '' })
                    .getCurrentNetwork()
            ).rejects.toThrow('No session found')
        })

        it('does not create a session for an existing user without an authentication party', async () => {
            const selfIssuedNetwork = {
                ...storeNetwork,
                id: 'self-issued-network',
                auth: { method: 'self_issued' },
            } as unknown as StoreNetwork
            const store = new StoreInternal(
                { idps: [idp], networks: [selfIssuedNetwork] },
                getLogger('mock')
            )
            ledgerMocks.get.mockResolvedValue({
                user: { id: 'alice', primaryParty: 'alice::ns' },
            })

            await expect(
                createController(
                    store,
                    notificationService,
                    logger,
                    undefined
                ).addSelfIssuedSession({
                    username: 'alice',
                    networkId: selfIssuedNetwork.id,
                    origin: 'https://example.com',
                })
            ).rejects.toThrow(
                'Self-issued login is not available for this user.'
            )
        })
    })

    describe('getUser', () => {
        it('returns user id and isAdmin false for a regular user', async () => {
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth,
                {},
                adminUserId
            )

            await expect(controller.getUser()).resolves.toEqual({
                userId: regularUserId,
                isAdmin: false,
            })
        })

        it('returns isAdmin true when the user matches adminUserId', async () => {
            const store = await createStore(logger, adminAuth)
            const controller = createController(
                store,
                notificationService,
                logger,
                adminAuth,
                {},
                adminUserId
            )

            await expect(controller.getUser()).resolves.toEqual({
                userId: adminUserId,
                isAdmin: true,
            })
        })

        it('throws when auth context is missing', async () => {
            const store = await createStore(logger, auth, {
                withSession: false,
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                undefined
            )

            await expect(controller.getUser()).rejects.toThrow()
        })
    })

    describe('networks', () => {
        it('rejects addNetwork for non-admin users', async () => {
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth,
                {},
                adminUserId
            )

            await expect(
                controller.addNetwork({
                    network: {
                        id: 'net-new',
                        name: 'New Net',
                        synchronizerId: 'sync::fingerprint',
                        identityProviderId: 'idp1',
                        ledgerApi: 'http://ledger.new',
                        auth: storeNetwork.auth,
                        description: 'description',
                    },
                })
            ).rejects.toThrow('Unauthorized')
        })

        it('adds a new network for the admin user', async () => {
            const store = await createStore(logger, adminAuth)
            const addSpy = vi.spyOn(store, 'addNetwork')
            const controller = createController(
                store,
                notificationService,
                logger,
                adminAuth,
                {},
                adminUserId
            )

            await controller.addNetwork({
                network: {
                    id: 'net-new',
                    name: 'New Net',
                    synchronizerId: 'sync::fingerprint',
                    identityProviderId: 'idp1',
                    ledgerApi: 'http://ledger.new',
                    auth: storeNetwork.auth,
                    description: 'description',
                },
            })

            expect(addSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'net-new',
                    ledgerApi: { baseUrl: 'http://ledger.new' },
                })
            )
        })

        it('rejects a new network referencing an unknown identity provider', async () => {
            const store = await createStore(logger, adminAuth)
            const addSpy = vi.spyOn(store, 'addNetwork')
            const controller = createController(
                store,
                notificationService,
                logger,
                adminAuth,
                {},
                adminUserId
            )

            await expect(
                controller.addNetwork({
                    network: {
                        id: 'net-new',
                        name: 'New Net',
                        synchronizerId: 'sync::fingerprint',
                        identityProviderId: 'missing-idp',
                        ledgerApi: 'http://ledger.new',
                        auth: storeNetwork.auth,
                        description: 'description',
                    },
                })
            ).rejects.toThrow('Identity provider "missing-idp" not found')

            expect(addSpy).not.toHaveBeenCalled()
        })

        it('updates an existing network for the admin user', async () => {
            const store = await createStore(logger, adminAuth)
            const updateSpy = vi.spyOn(store, 'updateNetwork')
            const controller = createController(
                store,
                notificationService,
                logger,
                adminAuth,
                {},
                adminUserId
            )

            await controller.addNetwork({
                network: {
                    id: 'network1',
                    name: 'Renamed Net',
                    synchronizerId: storeNetwork.synchronizerId,
                    identityProviderId: 'idp1',
                    ledgerApi: 'http://ledger.updated',
                    auth: storeNetwork.auth,
                    description: 'description',
                },
            })

            expect(updateSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'network1',
                    name: 'Renamed Net',
                })
            )
        })

        it('rejects an update with an unknown auth identity provider override', async () => {
            const store = await createStore(logger, adminAuth)
            const updateSpy = vi.spyOn(store, 'updateNetwork')
            const controller = createController(
                store,
                notificationService,
                logger,
                adminAuth,
                {},
                adminUserId
            )

            await expect(
                controller.addNetwork({
                    network: {
                        id: 'network1',
                        name: 'Renamed Net',
                        synchronizerId: storeNetwork.synchronizerId,
                        identityProviderId: 'idp1',
                        ledgerApi: 'http://ledger.updated',
                        auth: storeNetwork.auth,
                        adminAuth: {
                            method: 'client_credentials',
                            identityProviderId: 'missing-admin-idp',
                            clientId: 'admin-cid',
                            clientSecret: 'admin-secret',
                            audience: 'admin-aud',
                            scope: 'admin-scope',
                        },
                        description: 'description',
                    },
                })
            ).rejects.toThrow('Identity provider "missing-admin-idp" not found')

            expect(updateSpy).not.toHaveBeenCalled()
        })

        it('removes a network for the admin user', async () => {
            const store = await createStore(logger, adminAuth)
            const removeSpy = vi.spyOn(store, 'removeNetwork')
            const controller = createController(
                store,
                notificationService,
                logger,
                adminAuth,
                {},
                adminUserId
            )

            await controller.removeNetwork({ networkName: 'testnet' })

            expect(removeSpy).toHaveBeenCalledWith('testnet')
        })

        it('lists networks with ledgerApi as a string', async () => {
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            const result = await controller.listNetworks()

            expect(result.networks).toHaveLength(1)
            expect(result.networks[0]).toMatchObject({
                id: 'network1',
                ledgerApi: 'http://ledger.test',
            })
        })
    })

    describe('selfSignedAccessToken', () => {
        const selfSignedIdp: Idp = {
            id: 'idp-self-signed',
            type: 'self_signed',
            issuer: 'unsafe-auth',
        }

        const selfSignedNetwork: StoreNetwork = {
            id: 'network-self-signed',
            name: 'Self Signed',
            description: 'Test',
            identityProviderId: 'idp-self-signed',
            ledgerApi: { baseUrl: 'http://ledger.test' },
            auth: {
                method: 'self_signed',
                issuer: 'self-signed',
                audience: 'aud',
                scope: 'scope',
                clientId: 'operator',
                clientSecret: 'network-secret',
            },
        }

        it('mints a token when the client secret matches the network', async () => {
            const store = new StoreInternal(
                { idps: [selfSignedIdp], networks: [selfSignedNetwork] },
                getLogger('mock')
            )
            const controller = createController(
                store,
                notificationService,
                logger,
                undefined
            )

            const result = await controller.selfSignedAccessToken({
                networkId: 'network-self-signed',
                clientId: 'test-user',
                clientSecret: 'network-secret',
            })

            expect(typeof result.accessToken).toBe('string')
            const header = JSON.parse(
                Buffer.from(
                    result.accessToken.split('.')[0]!,
                    'base64url'
                ).toString()
            )
            const payload = JSON.parse(
                Buffer.from(
                    result.accessToken.split('.')[1]!,
                    'base64url'
                ).toString()
            )
            expect(header.kid).toBe('network-self-signed')
            expect(payload.sub).toBe('test-user')
        })

        it('rejects when the client secret does not match', async () => {
            const store = new StoreInternal(
                { idps: [selfSignedIdp], networks: [selfSignedNetwork] },
                getLogger('mock')
            )
            const controller = createController(
                store,
                notificationService,
                logger,
                undefined
            )

            await expect(
                controller.selfSignedAccessToken({
                    networkId: 'network-self-signed',
                    clientId: 'test-user',
                    clientSecret: 'wrong-secret',
                })
            ).rejects.toThrow('Invalid client secret')
        })
    })

    describe('idps', () => {
        it('adds and removes an idp for the admin user', async () => {
            const store = await createStore(logger, adminAuth)
            const addIdpSpy = vi.spyOn(store, 'addIdp')
            const removeIdpSpy = vi.spyOn(store, 'removeIdp')
            const controller = createController(
                store,
                notificationService,
                logger,
                adminAuth,
                {},
                adminUserId
            )

            const newIdp: Idp = {
                id: 'idp-new',
                type: 'self_signed',
                issuer: 'self',
            }
            await controller.addIdp({ idp: newIdp })
            expect(addIdpSpy).toHaveBeenCalledWith(newIdp)

            await controller.removeIdp({ identityProviderId: 'idp-new' })
            expect(removeIdpSpy).toHaveBeenCalledWith('idp-new')
        })

        it('updates an existing idp for the admin user', async () => {
            const store = await createStore(logger, adminAuth)
            const updateIdpSpy = vi.spyOn(store, 'updateIdp')
            const controller = createController(
                store,
                notificationService,
                logger,
                adminAuth,
                {},
                adminUserId
            )

            const updatedIdp: Idp = {
                ...idp,
                issuer: 'http://auth-updated',
            }
            await controller.addIdp({ idp: updatedIdp })

            expect(updateIdpSpy).toHaveBeenCalledWith(updatedIdp)
        })

        it('lists idps from the store', async () => {
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await expect(controller.listIdps()).resolves.toEqual({
                idps: [idp],
            })
        })
    })

    describe('setPrimaryWallet', () => {
        it('sets the primary wallet and emits accountsChanged', async () => {
            const store = await createStore(logger, auth)
            const setPrimarySpy = vi.spyOn(store, 'setPrimaryWallet')
            const notifier = notificationService.getNotifier('user-1')
            const emitSpy = vi.spyOn(notifier, 'emit')
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await controller.setPrimaryWallet({ partyId: 'party::namespace' })

            expect(setPrimarySpy).toHaveBeenCalledWith('party::namespace')
            expect(emitSpy).toHaveBeenCalledWith(
                'accountsChanged',
                expect.arrayContaining([
                    expect.objectContaining({ partyId: 'party::namespace' }),
                ])
            )
        })
    })

    describe('listWallets', () => {
        it('returns wallets from the store', async () => {
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            const wallets = await controller.listWallets({})
            expect(wallets).toHaveLength(1)
            expect(wallets[0]?.partyId).toBe('party::namespace')
        })
    })

    describe('message signing', () => {
        const pendingMessage: MessageRaw = {
            id: 'msg-1',
            status: 'pending',
            userId: auth.userId,
            partyId: primaryWallet.partyId,
            publicKey: primaryWallet.publicKey,
            message: 'Sign this',
            origin: 'https://dapp.example',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
        }

        async function storeWithMessage(
            message: MessageRaw = pendingMessage
        ): Promise<StoreInternal> {
            const store = await createStore(logger, auth)
            await store.setMessageRaw(message)
            return store
        }

        it('returns message details via getMessageToSign', async () => {
            const store = await storeWithMessage()
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            const result = await controller.getMessageToSign({
                messageId: 'msg-1',
            })

            expect(result.message).toMatchObject({
                id: 'msg-1',
                status: 'pending',
                message: 'Sign this',
                origin: 'https://dapp.example',
                createdAt: pendingMessage.createdAt.toISOString(),
            })
        })

        it('lists all messages to sign', async () => {
            const store = await storeWithMessage()
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            const result = await controller.listMessagesToSign()
            expect(result.messages).toHaveLength(1)
            expect(result.messages[0]?.id).toBe('msg-1')
        })

        it('deletes a pending message owned by the user and emits a failed event', async () => {
            const store = await storeWithMessage()
            const removeSpy = vi.spyOn(store, 'removeMessageRaw')
            const emitSpy = vi.spyOn(
                notificationService.getNotifier(session.id),
                'emit'
            )
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await controller.deleteMessageToSign({ messageId: 'msg-1' })

            expect(removeSpy).toHaveBeenCalledWith('msg-1')
            expect(emitSpy).toHaveBeenCalledExactlyOnceWith(
                'messageSignature',
                {
                    status: 'failed',
                    messageId: 'msg-1',
                }
            )
            expect(removeSpy.mock.invocationCallOrder[0]).toBeLessThan(
                emitSpy.mock.invocationCallOrder[0]!
            )
        })

        it('rejects delete when the message is not pending', async () => {
            const store = await storeWithMessage({
                ...pendingMessage,
                status: 'signed',
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await expect(
                controller.deleteMessageToSign({ messageId: 'msg-1' })
            ).rejects.toThrow("Cannot delete message with status 'signed'")
        })

        it('rejects delete when the message belongs to another user', async () => {
            const store = await storeWithMessage()
            vi.spyOn(store, 'getMessageRaw').mockResolvedValue({
                ...pendingMessage,
                userId: 'other-user',
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await expect(
                controller.deleteMessageToSign({ messageId: 'msg-1' })
            ).rejects.toThrow('not owned by user')
        })

        it('signs a pending WALLET_KERNEL message and emits messageSignature', async () => {
            const store = await storeWithMessage()
            const mockSignMessage = vi.fn().mockResolvedValue({
                signature: 'signature',
            })
            const drivers = {
                [SigningProvider.WALLET_KERNEL]: {
                    controller: vi.fn(() => ({ signMessage: mockSignMessage })),
                },
            }
            const notifier = notificationService.getNotifier('session-1')
            const emitSpy = vi.spyOn(notifier, 'emit')
            const controller = createController(
                store,
                notificationService,
                logger,
                auth,
                drivers
            )

            const result = await controller.signMessage({ messageId: 'msg-1' })

            expect(mockSignMessage).toHaveBeenCalledWith({
                message: 'Sign this',
                keyIdentifier: { publicKey: primaryWallet.publicKey },
            })
            expect(result).toEqual({
                signature: 'signature',
                publicKey: primaryWallet.publicKey,
            })
            expect(emitSpy).toHaveBeenCalledWith('messageSignature', {
                status: 'signed',
                messageId: 'msg-1',
                signature: 'signature',
            })
            const updated = await store.getMessageRaw('msg-1')
            expect(updated?.status).toBe('signed')
            expect(updated?.signature).toBe('signature')
        })

        it('rejects signMessage for non-WALLET_KERNEL wallets', async () => {
            const store = await createStore(logger, auth)
            await store.removeWallet(primaryWallet.partyId)
            await store.addWallet({
                ...primaryWallet,
                signingProviderId: SigningProvider.FIREBLOCKS,
            })
            await store.setMessageRaw(pendingMessage)
            const notifier = notificationService.getNotifier('session-1')
            const emitSpy = vi.spyOn(notifier, 'emit')
            const controller = createController(
                store,
                notificationService,
                logger,
                auth,
                {
                    [SigningProvider.WALLET_KERNEL]: {
                        controller: vi.fn(() => ({
                            signMessage: vi.fn(),
                        })),
                    },
                }
            )

            await expect(
                controller.signMessage({ messageId: 'msg-1' })
            ).rejects.toThrow('only supported for wallet-kernel')
            expect(emitSpy).toHaveBeenCalledWith('messageSignature', {
                status: 'failed',
                messageId: 'msg-1',
            })
        })
    })

    describe('transactions', () => {
        const transaction = pendingTransaction

        it('returns transaction details via getTransaction', async () => {
            const store = await createStore(logger, auth)
            await store.setTransaction(transaction)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            const result = await controller.getTransaction({
                transactionId: 'tx-1',
            })

            expect(result).toMatchObject({
                id: 'tx-1',
                commandId: 'cmd-1',
                status: 'pending',
                createdAt: transaction.createdAt!.toISOString(),
            })
        })

        it('lists transactions', async () => {
            const store = await createStore(logger, auth)
            await store.setTransaction(transaction)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            const result = await controller.listTransactions({})
            expect(result.transactions).toHaveLength(1)
            expect(result.transactions[0]?.id).toBe('tx-1')
        })

        it('deletes a pending transaction and emits a failed event', async () => {
            const store = await createStore(logger, auth)
            await store.setTransaction(transaction)
            const removeSpy = vi.spyOn(store, 'removeTransaction')
            const emitSpy = vi.spyOn(
                notificationService.getNotifier(session.id),
                'emit'
            )
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await controller.deleteTransaction({ transactionId: 'tx-1' })

            expect(removeSpy).toHaveBeenCalledWith('tx-1')
            expect(emitSpy).toHaveBeenCalledOnce()
            expect(emitSpy).toHaveBeenCalledWith('txChanged', {
                status: 'failed',
                commandId: transaction.commandId,
            })
            expect(removeSpy.mock.invocationCallOrder[0]).toBeLessThan(
                emitSpy.mock.invocationCallOrder[0]!
            )
        })

        it('rejects delete when the transaction is not pending', async () => {
            const store = await createStore(logger, auth)
            await store.setTransaction({ ...transaction, status: 'signed' })
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await expect(
                controller.deleteTransaction({ transactionId: 'tx-1' })
            ).rejects.toThrow("Cannot delete transaction with status 'signed'")
        })
    })

    describe('sign', () => {
        it('throws when there is no network session', async () => {
            const store = await createStore(logger, auth, {
                withSession: false,
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await expect(
                controller.sign({
                    transactionId: 'tx-1',
                    partyId: primaryWallet.partyId,
                })
            ).rejects.toThrow('No session found')
        })

        it('delegates to TransactionService.sign', async () => {
            const store = await createStore(logger, auth)
            await store.removeWallet(primaryWallet.partyId)
            await store.addWallet(participantWallet)
            transactionServiceMocks.sign.mockReturnValue({
                status: 'signed',
                signature: 'none',
                signedBy: 'namespace',
                partyId: participantWallet.partyId,
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                auth,
                {
                    [SigningProvider.PARTICIPANT]: {
                        controller: vi.fn(() => ({})),
                    },
                }
            )

            const signParams = {
                transactionId: 'tx-1',
                partyId: participantWallet.partyId,
            }
            const result = await controller.sign(signParams)

            expect(transactionServiceMocks.sign).toHaveBeenCalledWith(
                auth,
                participantWallet,
                signParams
            )
            expect(result).toMatchObject({ status: 'signed' })
        })
    })

    describe('execute', () => {
        const executeParams = {
            signature: 'sig',
            partyId: primaryWallet.partyId,
            transactionId: pendingTransaction.id,
            signedBy: primaryWallet.namespace,
        }

        it('delegates to TransactionService.execute', async () => {
            const store = await createStore(logger, auth)
            await store.removeWallet(primaryWallet.partyId)
            await store.addWallet(participantWallet)
            await store.setTransaction(pendingTransaction)
            transactionServiceMocks.execute.mockResolvedValue({
                commandId: pendingTransaction.commandId,
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                auth,
                {
                    [SigningProvider.PARTICIPANT]: {
                        controller: vi.fn(() => ({})),
                    },
                }
            )

            const params = {
                ...executeParams,
                partyId: participantWallet.partyId,
            }
            const result = await controller.execute(params)

            expect(transactionServiceMocks.execute).toHaveBeenCalledWith(
                auth.userId,
                participantWallet,
                expect.objectContaining({ id: pendingTransaction.id }),
                params,
                expect.objectContaining({
                    getWithRetry: ledgerMocks.getWithRetry,
                }),
                auth,
                expect.objectContaining({ id: storeNetwork.id })
            )
            expect(result).toEqual({ commandId: pendingTransaction.commandId })
        })

        it('delegates execute for external signing providers', async () => {
            const store = await createStore(logger, auth)
            await store.setTransaction(pendingTransaction)
            transactionServiceMocks.execute.mockResolvedValue({
                commandId: pendingTransaction.commandId,
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                auth,
                {
                    [SigningProvider.WALLET_KERNEL]: {
                        controller: vi.fn(() => ({})),
                    },
                }
            )

            const result = await controller.execute(executeParams)

            expect(transactionServiceMocks.execute).toHaveBeenCalledWith(
                auth.userId,
                primaryWallet,
                expect.objectContaining({ id: pendingTransaction.id }),
                executeParams,
                expect.objectContaining({
                    getWithRetry: ledgerMocks.getWithRetry,
                }),
                auth,
                expect.objectContaining({ id: storeNetwork.id })
            )
            expect(result).toEqual({ commandId: pendingTransaction.commandId })
        })
    })

    describe('sessions', () => {
        const validAddSessionClaims = {
            iss: idp.issuer,
            aud: storeNetwork.auth.audience,
            sub: 'sub',
            scope: 'scope1 scope2',
            scp: ['scope1', 'scope2'],
            exp: 1_900_000_000,
            iat: 1_800_000_000,
        }

        interface JwtClaims {
            iss: string
            aud: string
            sub: string
            scope?: string
            scp?: string[]
            exp: number
            iat: number
            azp?: string
            client_id?: string
        }

        const createAuthWithAddSessionClaims = (
            claimsOverride: Partial<JwtClaims> = {}
        ): AuthContext => ({
            ...auth,
            accessToken: createJwt({
                ...validAddSessionClaims,
                ...claimsOverride,
            }),
        })

        const createJwt = (payload: Record<string, unknown>): string => {
            const encode = (value: Record<string, unknown>): string =>
                Buffer.from(JSON.stringify(value)).toString('base64url')

            return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`
        }

        it('returns an empty list when there is no session', async () => {
            const store = await createStore(logger, auth, {
                withSession: false,
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await expect(controller.listSessions()).resolves.toEqual({
                sessions: [],
            })
        })

        it('lists the current session with network status', async () => {
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth,
                {},
                adminUserId
            )

            const result = await controller.listSessions()

            expect(result.sessions).toHaveLength(1)
            expect(result.sessions[0]).toMatchObject({
                id: 'session-1',
                status: 'connected',
                accessToken: 'access-token-1',
                network: expect.objectContaining({
                    id: 'network1',
                    ledgerApi: 'http://ledger.test',
                    auth: expect.objectContaining({
                        method: 'authorization_code',
                        clientId: 'cid',
                    }),
                }),
                idp,
            })
            expect(result.sessions[0].network).not.toHaveProperty('adminAuth')
            expect(result.sessions[0].network).not.toHaveProperty(
                'serviceAccountAuth'
            )
            expect(mockNetworkStatus).toHaveBeenCalled()
        })

        it('includes adminAuth in listSessions for the admin user', async () => {
            const store = await createStore(logger, adminAuth, {
                withSession: false,
            })
            await store.setSession({
                ...session,
                accessToken: adminAuth.accessToken,
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                adminAuth,
                {},
                adminUserId
            )

            const result = await controller.listSessions()

            expect(result.sessions).toHaveLength(1)
            expect(result.sessions[0].network).toMatchObject({
                id: 'network1',
                adminAuth: expect.objectContaining({
                    method: 'client_credentials',
                    clientId: 'admin-cid',
                    clientSecret: 'admin-secret',
                }),
            })
        })

        it('removeSession clears the session and emits statusChanged', async () => {
            const store = await createStore(logger, auth)
            const notifier = notificationService.getNotifier('session-1')
            const emitSpy = vi.spyOn(notifier, 'emit')
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await controller.removeSession()

            await expect(store.listSessions()).resolves.toHaveLength(0)
            expect(emitSpy).toHaveBeenCalledWith(
                'statusChanged',
                expect.objectContaining({
                    connection: expect.objectContaining({
                        isConnected: false,
                        reason: 'disconnect',
                    }),
                    userUrl: `${userUrl}/login/`,
                })
            )
        })

        it('addSession creates a session and emits connected', async () => {
            const newSessionId = '00000000-0000-0000-0000-000000000001'
            mockV4.mockReturnValueOnce(newSessionId)

            const authWithValidClaims = createAuthWithAddSessionClaims()
            const store = await createStore(logger, authWithValidClaims, {
                withWallet: false,
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                authWithValidClaims
            )

            const notifier = notificationService.getNotifier(newSessionId)
            const emitSpy = vi.spyOn(notifier, 'emit')

            const result = await controller.addSession({
                origin: 'dapp-1',
                networkId: 'network1',
            })

            expect(result.network.id).toBe('network1')
            expect(result.status).toBe('connected')
            expect(emitSpy).toHaveBeenCalledWith(
                'connected',
                expect.objectContaining({
                    session: {
                        accessToken: authWithValidClaims.accessToken,
                        userId: authWithValidClaims.userId,
                    },
                })
            )
            await expect(
                store.getSession(authWithValidClaims.accessToken)
            ).resolves.toMatchObject({
                network: 'network1',
            })
        })

        it('addSession keeps the session when the ledger is disconnected', async () => {
            mockNetworkStatus.mockResolvedValueOnce({
                isConnected: false,
                reason: 'Ledger unreachable: fetch failed',
            })
            const authWithValidClaims = createAuthWithAddSessionClaims()
            const store = await createStore(logger, authWithValidClaims, {
                withWallet: false,
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                authWithValidClaims
            )

            const result = await controller.addSession({
                networkId: 'network1',
                origin: 'dapp-1',
            })

            expect(result.status).toBe('disconnected')
            expect(result.reason).toBe('Ledger unreachable: fetch failed')
            expect(walletSyncMocks.syncWallets).not.toHaveBeenCalled()
            await expect(
                store.getSession(authWithValidClaims.accessToken)
            ).resolves.toMatchObject({
                network: 'network1',
            })
        })

        it('addSession keeps the session when initial wallet sync fails', async () => {
            walletSyncMocks.syncWallets.mockRejectedValueOnce(
                new Error('Wallet sync failed')
            )
            const authWithValidClaims = createAuthWithAddSessionClaims()
            const store = await createStore(logger, authWithValidClaims, {
                withWallet: false,
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                authWithValidClaims
            )

            const result = await controller.addSession({
                networkId: 'network1',
                origin: 'dapp-1',
            })

            expect(result.status).toBe('connected')
            expect(walletSyncMocks.syncWallets).toHaveBeenCalledOnce()
            await expect(
                store.getSession(authWithValidClaims.accessToken)
            ).resolves.toMatchObject({
                network: 'network1',
            })
        })

        it('addSession does not validate scope or scp against network.auth.scope', async () => {
            const authWithUnrelatedScopes = createAuthWithAddSessionClaims({
                scope: 'openid email',
                scp: ['profile'],
            })
            const store = await createStore(logger, authWithUnrelatedScopes, {
                withWallet: false,
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                authWithUnrelatedScopes
            )

            const result = await controller.addSession({
                origin: 'dapp-1',
                networkId: 'network1',
            })

            expect(result.status).toBe('connected')
        })

        it('addSession rejects token with issuer mismatch', async () => {
            const authWithInvalidIssuer = createAuthWithAddSessionClaims({
                iss: 'http://wrong-issuer',
            })
            const store = await createStore(logger, authWithInvalidIssuer, {
                withWallet: false,
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                authWithInvalidIssuer
            )

            await expect(
                controller.addSession({
                    origin: 'dapp-1',
                    networkId: 'network1',
                })
            ).rejects.toThrow('Failed to add session')
        })

        it('addSession rejects token with audience mismatch', async () => {
            const authWithInvalidAudience = createAuthWithAddSessionClaims({
                aud: 'wrong-audience',
            })
            const store = await createStore(logger, authWithInvalidAudience, {
                withWallet: false,
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                authWithInvalidAudience
            )

            await expect(
                controller.addSession({
                    origin: 'dapp-1',
                    networkId: 'network1',
                })
            ).rejects.toThrow('Failed to add session')
        })

        it('addSession rejects token with client_id claim and auth.clientId mismatch', async () => {
            const authWithInvalidSubject = createAuthWithAddSessionClaims({
                client_id: 'wrong-client-id',
            })
            const store = await createStore(logger, authWithInvalidSubject, {
                withWallet: false,
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                authWithInvalidSubject
            )

            await expect(
                controller.addSession({
                    origin: 'dapp-1',
                    networkId: 'network1',
                })
            ).rejects.toThrow('Failed to add session')
        })

        it('addSession rejects token with azp claim and auth.clientId mismatch', async () => {
            const authWithInvalidSubject = createAuthWithAddSessionClaims({
                azp: 'wrong-client-id',
            })
            const store = await createStore(logger, authWithInvalidSubject, {
                withWallet: false,
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                authWithInvalidSubject
            )

            await expect(
                controller.addSession({
                    origin: 'dapp-1',
                    networkId: 'network1',
                })
            ).rejects.toThrow('Failed to add session')
        })

        it("addSession passes when token doesn't token have azp and client-id claims", async () => {
            const authWithInvalidSubject = createAuthWithAddSessionClaims()
            const store = await createStore(logger, authWithInvalidSubject, {
                withWallet: false,
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                authWithInvalidSubject
            )

            const result = await controller.addSession({
                origin: 'dapp-1',
                networkId: 'network1',
            })
            expect(result).toMatchObject({
                network: expect.objectContaining({
                    id: 'network1',
                    auth: expect.objectContaining({
                        method: 'authorization_code',
                    }),
                }),
                status: 'connected',
            })
        })
    })

    describe('createWallet', () => {
        const walletKernelDriver = {
            [SigningProvider.WALLET_KERNEL]: { controller: vi.fn() },
        }

        it('throws when no network session exists', async () => {
            const store = await createStore(logger, auth, {
                withSession: false,
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                auth,
                { [SigningProvider.WALLET_KERNEL]: { controller: vi.fn() } }
            )

            await expect(
                controller.createWallet({
                    partyHint: 'alice',
                    signingProviderId: SigningProvider.WALLET_KERNEL,
                })
            ).rejects.toThrow('No session found')
        })

        it('throws when the signing provider is not configured', async () => {
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await expect(
                controller.createWallet({
                    partyHint: 'alice',
                    signingProviderId: SigningProvider.WALLET_KERNEL,
                })
            ).rejects.toThrow('Signing provider wallet-kernel not supported')
        })

        it('creates a wallet when the signing provider is configured', async () => {
            const authWithEmail = { ...auth, email: 'user@example.com' }
            const store = await createStore(logger, authWithEmail)
            const newWallet: Wallet = {
                ...primaryWallet,
                partyId: 'party::new',
                primary: false,
                rights: [],
            }
            walletAllocationMocks.createWallet.mockImplementation(async () => {
                await store.addWallet(newWallet)
                return newWallet
            })
            walletSyncMocks.syncRights.mockImplementation(async () => {
                await store.updateWallet({
                    partyId: newWallet.partyId,
                    rights: [PartyLevelRight.CanActAs],
                })
                return []
            })
            const notifier = notificationService.getNotifier('user-1')
            const emitSpy = vi.spyOn(notifier, 'emit')
            const controller = createController(
                store,
                notificationService,
                logger,
                authWithEmail,
                walletKernelDriver
            )

            const result = await controller.createWallet({
                partyHint: 'alice',
                signingProviderId: SigningProvider.WALLET_KERNEL,
                primary: false,
            })

            expect(walletAllocationMocks.createWallet).toHaveBeenCalledWith(
                authWithEmail,
                'alice',
                false,
                SigningProvider.WALLET_KERNEL,
                undefined
            )
            expect(walletSyncMocks.syncRights).toHaveBeenCalledOnce()
            expect(walletSyncMocks.syncWallets).not.toHaveBeenCalled()
            expect(emitSpy).toHaveBeenCalledWith(
                'accountsChanged',
                expect.any(Array)
            )
            expect(result.wallet).toMatchObject({
                partyId: 'party::new',
                rights: [PartyLevelRight.CanActAs],
            })
        })

        it('passes auth context to wallet allocation service', async () => {
            const authWithEmail = { ...auth, email: 'direct@example.com' }
            const store = await createStore(logger, authWithEmail)
            walletAllocationMocks.createWallet.mockResolvedValue(primaryWallet)
            const controller = createController(
                store,
                notificationService,
                logger,
                authWithEmail,
                walletKernelDriver
            )

            await controller.createWallet({
                partyHint: 'bob',
                signingProviderId: SigningProvider.WALLET_KERNEL,
            })

            expect(walletAllocationMocks.createWallet).toHaveBeenCalledWith(
                authWithEmail,
                'bob',
                false,
                SigningProvider.WALLET_KERNEL,
                undefined
            )
        })

        it('throws when no current network is configured', async () => {
            const store = await createStore(logger, auth)
            // @ts-expect-error type doesn't allow empty return. override to validate guard clause
            vi.spyOn(store, 'getCurrentNetwork').mockResolvedValue(undefined)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth,
                walletKernelDriver
            )

            await expect(
                controller.createWallet({
                    partyHint: 'alice',
                    signingProviderId: SigningProvider.WALLET_KERNEL,
                })
            ).rejects.toThrow('No network session found')
            expect(walletAllocationMocks.createWallet).not.toHaveBeenCalled()
        })
    })

    describe('allocatePartyForWallet', () => {
        const walletKernelDriver = {
            [SigningProvider.WALLET_KERNEL]: { controller: vi.fn() },
        }

        it('allocates a party for an existing wallet', async () => {
            const authWithEmail = { ...auth, email: 'user@example.com' }
            const store = await createStore(logger, authWithEmail)
            const notifier = notificationService.getNotifier('user-1')
            const emitSpy = vi.spyOn(notifier, 'emit')
            const controller = createController(
                store,
                notificationService,
                logger,
                authWithEmail,
                walletKernelDriver
            )

            walletSyncMocks.syncRights.mockImplementation(async () => {
                await store.updateWallet({
                    partyId: primaryWallet.partyId,
                    rights: [
                        PartyLevelRight.CanActAs,
                        PartyLevelRight.CanReadAs,
                    ],
                })
                return []
            })

            const result = await controller.allocatePartyForWallet({
                partyId: primaryWallet.partyId,
            })

            expect(walletAllocationMocks.allocateParty).toHaveBeenCalledWith(
                authWithEmail,
                primaryWallet,
                SigningProvider.WALLET_KERNEL
            )
            expect(walletSyncMocks.syncRights).toHaveBeenCalledOnce()
            expect(walletSyncMocks.syncWallets).not.toHaveBeenCalled()
            expect(emitSpy).toHaveBeenCalledWith(
                'accountsChanged',
                expect.any(Array)
            )
            expect(result.wallet).toMatchObject({
                partyId: primaryWallet.partyId,
                networkId: storeNetwork.id,
                rights: [PartyLevelRight.CanActAs, PartyLevelRight.CanReadAs],
            })
        })

        it('throws when the wallet is not found', async () => {
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth,
                walletKernelDriver
            )

            await expect(
                controller.allocatePartyForWallet({
                    partyId: 'party::missing',
                })
            ).rejects.toThrow('Wallet not found for party party::missing')
        })

        it('throws when the signing provider is not configured', async () => {
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await expect(
                controller.allocatePartyForWallet({
                    partyId: primaryWallet.partyId,
                })
            ).rejects.toThrow('Signing provider wallet-kernel not supported')
        })
    })

    describe('syncWallets', () => {
        it('syncs wallets and returns the result without emitting when nothing changed', async () => {
            const store = await createStore(logger, auth)
            const notifier = notificationService.getNotifier('session-1')
            const emitSpy = vi.spyOn(notifier, 'emit')
            const emptyResult = { added: [], updated: [], disabled: [] }
            walletSyncMocks.syncWallets.mockResolvedValue(emptyResult)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            const result = await controller.syncWallets()

            expect(walletSyncMocks.syncWallets).toHaveBeenCalledOnce()
            expect(result).toEqual(emptyResult)
            expect(emitSpy).not.toHaveBeenCalledWith(
                'accountsChanged',
                expect.anything()
            )
        })

        it('throws when admin auth is not configured', async () => {
            const networkWithoutAdmin: StoreNetwork = {
                ...storeNetwork,
                adminAuth: undefined,
            }
            const store = new StoreInternal(
                { idps: [idp], networks: [networkWithoutAdmin] },
                getLogger('mock'),
                auth
            )
            await store.setSession(session)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await expect(controller.syncWallets()).rejects.toThrow(
                'No admin auth configured'
            )
            expect(walletSyncMocks.syncWallets).not.toHaveBeenCalled()
        })

        it('throws when auth context is missing', async () => {
            const store = await createStore(logger, auth, {
                withSession: false,
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                undefined
            )

            await expect(controller.syncWallets()).rejects.toThrow()
            expect(walletSyncMocks.syncWallets).not.toHaveBeenCalled()
        })

        it('emits accountsChanged when wallets are added and disabled during sync', async () => {
            const store = await createStore(logger, auth)
            const notifier = notificationService.getNotifier('user-1')
            const emitSpy = vi.spyOn(notifier, 'emit')
            const addedWallet: Wallet = {
                ...primaryWallet,
                partyId: 'party::added',
            }
            const disabledWallet: Wallet = {
                ...primaryWallet,
                partyId: 'party::disabled',
                status: 'removed',
            }
            const syncResult = {
                added: [addedWallet],
                updated: [],
                disabled: [disabledWallet],
            }
            walletSyncMocks.syncWallets.mockResolvedValue(syncResult)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            const result = await controller.syncWallets()

            expect(result).toEqual(syncResult)
            expect(emitSpy).toHaveBeenCalledWith(
                'accountsChanged',
                expect.arrayContaining([
                    expect.objectContaining({ partyId: primaryWallet.partyId }),
                ])
            )
        })

        it('does not emit accountsChanged when only wallets are added', async () => {
            const store = await createStore(logger, auth)
            const notifier = notificationService.getNotifier('session-1')
            const emitSpy = vi.spyOn(notifier, 'emit')
            walletSyncMocks.syncWallets.mockResolvedValue({
                added: [{ ...primaryWallet, partyId: 'party::added' }],
                updated: [],
                disabled: [],
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await controller.syncWallets()

            expect(emitSpy).not.toHaveBeenCalledWith(
                'accountsChanged',
                expect.anything()
            )
        })
    })

    describe('isWalletSyncNeeded', () => {
        it('returns false when wallet sync is not needed', async () => {
            const store = await createStore(logger, auth)
            walletSyncMocks.isWalletSyncNeeded.mockResolvedValue(false)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            const result = await controller.isWalletSyncNeeded()

            expect(walletSyncMocks.isWalletSyncNeeded).toHaveBeenCalledOnce()
            expect(result).toEqual({ walletSyncNeeded: false })
        })

        it('returns true when wallet sync is needed', async () => {
            const store = await createStore(logger, auth)
            walletSyncMocks.isWalletSyncNeeded.mockResolvedValue(true)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            const result = await controller.isWalletSyncNeeded()

            expect(walletSyncMocks.isWalletSyncNeeded).toHaveBeenCalledOnce()
            expect(result).toEqual({ walletSyncNeeded: true })
        })

        it('throws when admin auth is not configured', async () => {
            const networkWithoutAdmin: StoreNetwork = {
                ...storeNetwork,
                adminAuth: undefined,
            }
            const store = new StoreInternal(
                { idps: [idp], networks: [networkWithoutAdmin] },
                getLogger('mock'),
                auth
            )
            await store.setSession(session)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await expect(controller.isWalletSyncNeeded()).rejects.toThrow(
                'No admin auth configured'
            )
            expect(walletSyncMocks.isWalletSyncNeeded).not.toHaveBeenCalled()
        })

        it('throws when auth context is missing', async () => {
            const store = await createStore(logger, auth, {
                withSession: false,
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                undefined
            )

            await expect(controller.isWalletSyncNeeded()).rejects.toThrow()
            expect(walletSyncMocks.isWalletSyncNeeded).not.toHaveBeenCalled()
        })
    })
})
