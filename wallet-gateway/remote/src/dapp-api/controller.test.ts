// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { pino, type Logger } from 'pino'
import { sink } from 'pino-test'
import type { AuthContext, Idp } from '@canton-network/core-wallet-auth'
import {
    type Network as StoreNetwork,
    PartyLevelRight,
    type Session,
    type Wallet,
} from '@canton-network/core-wallet-store'
import { StoreInternal } from '@canton-network/core-wallet-store-inmemory'
import { SigningProvider } from '@canton-network/core-signing-lib'
import type { KernelInfo } from '../config/Config.js'
import { NotificationService } from '@canton-network/core-wallet-services'
import { dappController, type DappControllerDeps } from './controller.js'
import { getLogger } from '@logtape/logtape'

const ledgerMocks = vi.hoisted(() => ({
    getWithRetry: vi.fn(),
    postWithRetry: vi.fn(),
    getSynchronizerId: vi.fn(),
}))

const mockNetworkStatus = vi.hoisted(() =>
    vi.fn().mockResolvedValue({
        isConnected: true,
        reason: undefined,
        cantonVersion: '3.4',
    })
)

const mockUuidV4 = vi.hoisted(() => vi.fn())

vi.mock('@canton-network/core-ledger-client', async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import('@canton-network/core-ledger-client')
        >()
    return {
        ...actual,
        LedgerClient: vi.fn(function LedgerClientMock() {
            return {
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
    }
})

vi.mock('uuid', () => ({
    v4: mockUuidV4,
}))

const kernelInfo: KernelInfo = {
    id: 'kernel-test',
    clientType: 'browser',
}

const dappUrl = 'https://dapp.api.example'
const userUrl = 'https://user.api.example'
const origin = 'https://dapp.example'

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
        scope: 'scope',
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
    userId: 'user-1',
    accessToken: 'access-token-1',
}

const session: Session = {
    id: 'session-1',
    origin: 'dapp-1',
    network: 'network1',
    accessToken: 'access-token-1',
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
    requestOrigin: string | null = origin,
    deps?: DappControllerDeps
) {
    return dappController(
        kernelInfo,
        dappUrl,
        userUrl,
        store,
        notificationService,
        logger,
        requestOrigin,
        deps || { signingDrivers: {} },
        'HASHING_SCHEME_VERSION_V3',
        context
    )
}

describe('dappController', () => {
    let logger: Logger
    let notificationService: NotificationService

    beforeEach(() => {
        logger = pino({ level: 'silent' }, sink())
        notificationService = new NotificationService(logger)
        ledgerMocks.getWithRetry.mockReset()
        ledgerMocks.postWithRetry.mockReset()
        ledgerMocks.getSynchronizerId.mockReset()
        ledgerMocks.getSynchronizerId.mockResolvedValue('sync-from-ledger')
        mockNetworkStatus.mockReset()
        mockNetworkStatus.mockResolvedValue({
            isConnected: true,
            reason: undefined,
            cantonVersion: '3.4',
        })
        mockUuidV4.mockReset()
    })

    describe('connect', () => {
        it('returns unauthenticated when there is no auth context', async () => {
            const store = await createStore(logger, auth, {
                withSession: false,
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                undefined
            )

            await expect(controller.connect()).resolves.toEqual({
                isConnected: false,
                isNetworkConnected: false,
                networkReason: 'Unauthenticated',
                userUrl: `${userUrl}/login/`,
            })
        })

        it('returns unauthenticated when there is no session', async () => {
            const store = await createStore(logger, auth, {
                withSession: false,
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await expect(controller.connect()).resolves.toEqual({
                isConnected: false,
                isNetworkConnected: false,
                networkReason: 'Unauthenticated',
                userUrl: `${userUrl}/login/`,
            })
        })

        it('connects and emits statusChanged and connected', async () => {
            const store = await createStore(logger, auth)
            const notifier = notificationService.getNotifier('session-1')
            const emitSpy = vi.spyOn(notifier, 'emit')
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            const result = await controller.connect()

            expect(result).toMatchObject({
                isConnected: true,
                reason: 'OK',
                isNetworkConnected: true,
                networkReason: 'OK',
                userUrl: `${userUrl}/login/`,
            })
            expect(mockNetworkStatus).toHaveBeenCalled()
            expect(emitSpy).toHaveBeenCalledWith(
                'statusChanged',
                expect.objectContaining({
                    connection: expect.objectContaining({
                        isConnected: true,
                    }),
                    session: {
                        accessToken: auth.accessToken,
                        userId: auth.userId,
                    },
                })
            )
            expect(emitSpy).toHaveBeenCalledWith(
                'connected',
                expect.objectContaining({
                    provider: expect.objectContaining({ id: kernelInfo.id }),
                })
            )
        })

        it('reflects disconnected ledger in network status', async () => {
            mockNetworkStatus.mockResolvedValue({
                isConnected: false,
                reason: 'Ledger unreachable',
            })
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            const result = await controller.connect()

            expect(result).toMatchObject({
                isConnected: true,
                isNetworkConnected: false,
                networkReason: 'Ledger unreachable',
            })
        })
    })

    describe('disconnect', () => {
        it('returns null when there is no auth context', async () => {
            const store = await createStore(logger, auth)
            const removeSessionSpy = vi.spyOn(store, 'removeSession')
            const controller = createController(
                store,
                notificationService,
                logger,
                undefined
            )

            await expect(controller.disconnect()).resolves.toBeNull()
            expect(removeSessionSpy).not.toHaveBeenCalled()
        })

        it('removes the session and emits statusChanged', async () => {
            const store = await createStore(logger, auth)
            const notifier = notificationService.getNotifier('session-1')
            const emitSpy = vi.spyOn(notifier, 'emit')
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await controller.disconnect()

            await expect(store.listSessions()).resolves.toHaveLength(0)
            expect(emitSpy).toHaveBeenCalledWith(
                'statusChanged',
                expect.objectContaining({
                    connection: expect.objectContaining({
                        isConnected: false,
                        reason: 'disconnect',
                    }),
                })
            )
        })
    })

    describe('isConnected', () => {
        it('returns unauthenticated when there is no session', async () => {
            const store = await createStore(logger, auth, {
                withSession: false,
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await expect(controller.isConnected()).resolves.toEqual({
                isConnected: false,
                isNetworkConnected: false,
                networkReason: 'Unauthenticated',
                userUrl: `${userUrl}/login/`,
            })
        })

        it('returns connected status when authenticated', async () => {
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await expect(controller.isConnected()).resolves.toEqual({
                isConnected: true,
                reason: 'OK',
                isNetworkConnected: true,
                networkReason: 'OK',
                userUrl: `${userUrl}/login/`,
            })
        })
    })

    describe('status', () => {
        it('returns unauthenticated status when there is no session', async () => {
            const store = await createStore(logger, auth, {
                withSession: false,
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            const result = await controller.status()

            expect(result.connection).toMatchObject({
                isConnected: false,
                reason: 'Unauthenticated',
            })
            expect(result.network).toBeUndefined()
        })

        it('returns full status when authenticated', async () => {
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            const result = await controller.status()

            expect(result).toMatchObject({
                provider: expect.objectContaining({ id: kernelInfo.id }),
                connection: {
                    isConnected: true,
                    reason: 'OK',
                    isNetworkConnected: true,
                    networkReason: 'OK',
                },
                network: {
                    networkId: storeNetwork.id,
                    ledgerApi: storeNetwork.ledgerApi.baseUrl,
                    accessToken: auth.accessToken,
                },
                session: {
                    id: session.id,
                    accessToken: auth.accessToken,
                    userId: auth.userId,
                },
                userUrl: `${userUrl}/login/`,
            })
        })
    })

    describe('ledgerApi', () => {
        it('performs GET via ledger client', async () => {
            ledgerMocks.getWithRetry.mockResolvedValueOnce({ ok: true })
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            const result = await controller.ledgerApi({
                requestMethod: 'get',
                resource: '/v2/parties',
                path: { partyId: 'party::x' },
                query: { limit: '10' },
            })

            expect(ledgerMocks.getWithRetry).toHaveBeenCalledWith(
                '/v2/parties',
                undefined,
                {
                    path: { partyId: 'party::x' },
                    query: { limit: '10' },
                }
            )
            expect(result).toEqual({ ok: true })
        })

        it('performs POST via ledger client', async () => {
            ledgerMocks.postWithRetry.mockResolvedValueOnce({ created: true })
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            const result = await controller.ledgerApi({
                requestMethod: 'post',
                resource: '/v2/commands/submit-and-wait',
                body: { commands: [] },
                query: { wait: 'true' },
            })

            expect(ledgerMocks.postWithRetry).toHaveBeenCalledWith(
                '/v2/commands/submit-and-wait',
                { commands: [] },
                undefined,
                { query: { wait: 'true' }, path: {} }
            )
            expect(result).toEqual({ created: true })
        })

        it('throws for unsupported request methods', async () => {
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await expect(
                controller.ledgerApi({
                    requestMethod: 'patch' as 'get',
                    resource: '/v2/parties',
                })
            ).rejects.toThrow('Unsupported request method: patch')
        })

        it('throws when auth context is missing', async () => {
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                undefined
            )

            await expect(
                controller.ledgerApi({
                    requestMethod: 'get',
                    resource: '/v2/parties',
                })
            ).rejects.toThrow()
        })

        it('throws an error if an incorrect get endpoint is supplied', async () => {
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await expect(
                controller.ledgerApi({
                    requestMethod: 'get',
                    resource: '/v2/badresource',
                })
            ).rejects.toThrow(`Unsupported get resource: /v2/badresource`)
        })

        it('throws an error if an incorrect post endpoint is supplied', async () => {
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await expect(
                controller.ledgerApi({
                    requestMethod: 'post',
                    resource: '/v2/state/ledger-end',
                })
            ).rejects.toThrow(`Unsupported post resource: /v2/state/ledger-end`)
        })
    })

    describe('prepareExecute', () => {
        const prepareParams = {
            commands: [
                {
                    CreateCommand: {
                        templateId: 'pkg:Mod:T',
                        createArguments: {},
                    },
                },
            ],
        }

        it('throws when auth context is missing', async () => {
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                undefined
            )

            await expect(
                controller.prepareExecute(prepareParams as never)
            ).rejects.toMatchObject({ code: 4100 })
        })

        it('throws when there is no primary wallet', async () => {
            const store = await createStore(logger, auth, { withWallet: false })
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await expect(
                controller.prepareExecute(prepareParams as never)
            ).rejects.toThrow('No primary wallet found')
        })

        it('prepares a transaction and returns the approve URL', async () => {
            mockUuidV4.mockReturnValueOnce('generated-command-id')
            mockUuidV4.mockReturnValueOnce('transaction-id')
            ledgerMocks.postWithRetry.mockResolvedValueOnce({
                preparedTransaction: 'prepared-blob',
                preparedTransactionHash: 'hash',
            })
            const store = await createStore(logger, auth)
            const setTransactionSpy = vi.spyOn(store, 'setTransaction')
            const notifier = notificationService.getNotifier('session-1')
            const emitSpy = vi.spyOn(notifier, 'emit')
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            const result = await controller.prepareExecute(
                prepareParams as never
            )

            expect(emitSpy).toHaveBeenCalledWith('txChanged', {
                status: 'pending',
                commandId: 'generated-command-id',
            })
            expect(ledgerMocks.postWithRetry).toHaveBeenCalledWith(
                '/v2/interactive-submission/prepare',
                expect.any(Object)
            )
            expect(setTransactionSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'transaction-id',
                    commandId: 'generated-command-id',
                    status: 'pending',
                    preparedTransaction: 'prepared-blob',
                    preparedTransactionHash: 'hash',
                    origin,
                })
            )
            expect(result.userUrl).toBe(
                `${userUrl}/approve/index.html?transactionId=transaction-id&commandId=generated-command-id&closeafteraction`
            )
        })

        it('uses the provided commandId when present', async () => {
            mockUuidV4.mockReturnValueOnce('transaction-id')
            ledgerMocks.postWithRetry.mockResolvedValueOnce({
                preparedTransaction: 'prepared-blob',
                preparedTransactionHash: 'hash',
            })
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await controller.prepareExecute({
                ...prepareParams,
                commandId: 'existing-command-id',
            } as never)

            expect(mockUuidV4).toHaveBeenCalledOnce()
            expect(ledgerMocks.postWithRetry.mock.calls[0][1]).toMatchObject({
                commandId: 'existing-command-id',
            })
        })

        it('fetches synchronizerId from ledger when not on network', async () => {
            const networkWithoutSync: StoreNetwork = {
                ...storeNetwork,
                synchronizerId: undefined as unknown as string,
            }
            const store = new StoreInternal(
                { idps: [idp], networks: [networkWithoutSync] },
                getLogger('mock'),
                auth
            )
            await store.setSession(session)
            await store.addWallet(primaryWallet)
            mockUuidV4.mockReturnValueOnce('cmd-id')
            mockUuidV4.mockReturnValueOnce('tx-id')
            ledgerMocks.postWithRetry.mockResolvedValueOnce({
                preparedTransaction: 'blob',
                preparedTransactionHash: 'hash',
            })
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await controller.prepareExecute(prepareParams as never)

            expect(ledgerMocks.getSynchronizerId).toHaveBeenCalled()
        })
    })

    it.each(['listAccounts', 'getPrimaryAccount', 'getActiveNetwork'] as const)(
        '%s rejects with Unauthorized when auth context is missing',
        async (method) => {
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                undefined
            )

            await expect(controller[method]()).rejects.toMatchObject({
                code: 4100,
            })
        }
    )

    describe('signMessage', () => {
        it('throws when message is missing', async () => {
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await expect(
                controller.signMessage({ message: '' })
            ).rejects.toThrow('Message is required')
        })

        it('throws when auth context is missing', async () => {
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                undefined
            )

            await expect(
                controller.signMessage({ message: 'hello' })
            ).rejects.toMatchObject({ code: 4100 })
        })

        it('throws when there is no primary wallet', async () => {
            const store = await createStore(logger, auth, { withWallet: false })
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await expect(
                controller.signMessage({ message: 'hello' })
            ).rejects.toThrow('No primary wallet found')
        })

        it('stores a pending message and returns the sign URL', async () => {
            mockUuidV4.mockReturnValueOnce('message-id')
            const store = await createStore(logger, auth)
            const setMessageSpy = vi.spyOn(store, 'setMessageRaw')
            const notifier = notificationService.getNotifier('session-1')
            const emitSpy = vi.spyOn(notifier, 'emit')
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            const result = await controller.signMessage({ message: 'hello' })

            expect(setMessageSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'message-id',
                    status: 'pending',
                    userId: auth.userId,
                    partyId: primaryWallet.partyId,
                    publicKey: primaryWallet.publicKey,
                    message: 'hello',
                    origin,
                })
            )
            expect(emitSpy).toHaveBeenCalledWith('messageSignature', {
                status: 'pending',
                messageId: 'message-id',
            })
            expect(result).toEqual({
                messageId: 'message-id',
                userUrl: `${userUrl}/sign-message/index.html?messageId=message-id&closeafteraction`,
            })
        })
    })

    describe('accounts', () => {
        it('lists accounts from the store', async () => {
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            const accounts = await controller.listAccounts()

            expect(accounts).toHaveLength(1)
            expect(accounts[0]?.partyId).toBe(primaryWallet.partyId)
        })

        it('returns the primary account', async () => {
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await expect(controller.getPrimaryAccount()).resolves.toEqual(
                primaryWallet
            )
        })

        it('throws when there is no primary account', async () => {
            const store = await createStore(logger, auth, { withWallet: false })
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await expect(controller.getPrimaryAccount()).rejects.toThrow(
                'No primary wallet found'
            )
        })

        it('returns the active network with access token when authenticated', async () => {
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await expect(controller.getActiveNetwork()).resolves.toEqual({
                networkId: storeNetwork.id,
                ledgerApi: storeNetwork.ledgerApi.baseUrl,
                accessToken: auth.accessToken,
            })
        })
    })

    describe('event-only methods', () => {
        it.each([
            'connected',
            'onStatusChanged',
            'accountsChanged',
            'txChanged',
        ] as const)('%s throws Only for events', async (method) => {
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            await expect(controller[method]()).rejects.toThrow(
                'Only for events.'
            )
        })

        it('messageSignature throws Only for events', async () => {
            const store = await createStore(logger, auth)
            const controller = createController(
                store,
                notificationService,
                logger,
                auth
            )

            expect(() => controller.messageSignature()).toThrow(
                'Only for events.'
            )
        })
    })
})
