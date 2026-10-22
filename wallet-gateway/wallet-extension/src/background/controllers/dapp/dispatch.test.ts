// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LedgerClient } from '@canton-network/core-ledger-client'
import { errorCodes } from '@canton-network/core-rpc-errors'
import { SigningProvider } from '@canton-network/core-signing-lib'
import type { JsonRpcRequest } from '@canton-network/core-types'
import {
    NotificationService,
    subscribeNotifications,
} from '@canton-network/core-wallet-services'
import {
    PartyLevelRight,
    type Store,
    type Wallet,
} from '@canton-network/core-wallet-store'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { approvalRequestsItem } from '@/shared/storage'
import type { VaultStatus } from '@/shared/vault-protocol'
import { authContext as authContextStorage } from '../../auth-context'
import { initializeWalletStore, type WalletStore } from '../../store'
import { createDappDispatcher, type DappDispatcher } from './dispatch'

const origin = 'https://dapp.example'
const networkId = 'canton:local-oauth'
const authContext = { userId: 'user-1', accessToken: 'token-1' }
const vaultIn = (status: VaultStatus) => ({
    ready: Promise.resolve(),
    status: () => status,
})

const request = (
    method: string,
    params?: JsonRpcRequest['params']
): JsonRpcRequest => ({
    jsonrpc: '2.0',
    id: 7,
    method,
    ...(params && { params }),
})

describe('createDappDispatcher', () => {
    let service: NotificationService
    let walletStore: WalletStore
    let dispatcher: DappDispatcher

    beforeEach(async () => {
        fakeBrowser.reset()
        service = new NotificationService({ debug: vi.fn(), error: vi.fn() })
        walletStore = await initializeWalletStore()
        dispatcher = createDappDispatcher(
            {
                getStore: async () => walletStore,
                notificationService: service,
            },
            vaultIn('unlocked')
        )
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it.each([
        'unknownMethod',
        'constructor',
        'toString',
        'hasOwnProperty',
        '__proto__',
    ])('returns methodNotFound for %s', async (method) => {
        const response = await dispatcher.request(request(method), origin)

        expect(response).toEqual({
            jsonrpc: '2.0',
            id: 7,
            error: expect.objectContaining({
                code: errorCodes.rpc.methodNotFound,
                message: `Method ${method} not found`,
            }),
        })
    })

    it('returns the method result', async () => {
        const response = await dispatcher.request(request('status'), origin)

        expect(response).toEqual({
            jsonrpc: '2.0',
            id: 7,
            result: {
                provider: {
                    id: 'browser:ext:canton-wallet',
                    providerType: 'browser',
                    userUrl: 'chrome-extension://test-extension-id/popup.html',
                },
                connection: {
                    isConnected: false,
                    reason: 'Unauthenticated',
                    isNetworkConnected: false,
                    networkReason: 'Unauthenticated',
                },
            },
        })
    })

    it('keeps the code of a thrown JSON-RPC error', async () => {
        const response = await dispatcher.request(
            request('getPrimaryAccount'),
            origin
        )

        expect(response).toMatchObject({
            jsonrpc: '2.0',
            id: 7,
            error: {
                code: errorCodes.provider.unauthorized,
                message: 'User is not connected',
            },
        })
    })

    it('turns any other thrown error into an internal error', async () => {
        const response = await dispatcher.request(
            request('signMessage', { message: 'hello' }),
            origin
        )

        expect(response).toMatchObject({
            jsonrpc: '2.0',
            id: 7,
            error: {
                code: errorCodes.rpc.internal,
                message: 'Function signMessage not implemented.',
            },
        })
    })

    it('answers status and refuses other methods while locked', async () => {
        const load = vi
            .spyOn(authContextStorage, 'load')
            .mockResolvedValue(authContext)
        const getStore = vi.fn(async () => walletStore)
        const locked = createDappDispatcher(
            { getStore, notificationService: service },
            vaultIn('locked')
        )

        await expect(
            locked.request(request('status'), origin)
        ).resolves.toMatchObject({
            result: { connection: { isConnected: false, reason: 'Locked' } },
        })
        await expect(
            locked.request(request('listAccounts'), origin)
        ).resolves.toMatchObject({
            error: {
                code: errorCodes.provider.unauthorized,
                message: 'Wallet is locked',
            },
        })
        // Locked means no signed-in user: neither the auth context nor the
        // store is read.
        expect(load).not.toHaveBeenCalled()
        expect(getStore).not.toHaveBeenCalled()
    })

    describe('when signed in', () => {
        const wallet: Wallet = {
            primary: true,
            status: 'allocated',
            partyId: 'party::namespace',
            hint: 'party',
            namespace: 'namespace',
            signingProviderId: SigningProvider.WALLET_KERNEL,
            publicKey: 'public-key',
            networkId,
            rights: [PartyLevelRight.CanActAs],
            userId: authContext.userId,
        }
        const sessionId = 'session-1'
        let store: Store

        beforeEach(async () => {
            vi.spyOn(authContextStorage, 'load').mockResolvedValue(authContext)
            store = walletStore.withAuthContext(authContext)
            // The session's origin is where the user logged in, not the dApp.
            await store.setSession({
                id: sessionId,
                origin: 'browserext',
                network: networkId,
                accessToken: authContext.accessToken,
            })
            await store.addWallet({ ...wallet })
        })

        it('reports the session in status', async () => {
            vi.spyOn(LedgerClient.prototype, 'get').mockResolvedValue({
                version: '3.4.0',
            })

            const response = await dispatcher.request(request('status'), origin)

            expect(response).toMatchObject({
                result: {
                    connection: {
                        isConnected: true,
                        reason: 'OK',
                        isNetworkConnected: true,
                        networkReason: 'OK',
                    },
                    network: {
                        networkId,
                        ledgerApi: 'http://127.0.0.1:5003',
                    },
                    session: { userId: authContext.userId },
                },
            })
        })

        it('returns the primary account and active network', async () => {
            await expect(
                dispatcher.request(request('getPrimaryAccount'), origin)
            ).resolves.toMatchObject({ result: { partyId: wallet.partyId } })
            await expect(
                dispatcher.request(request('getActiveNetwork'), origin)
            ).resolves.toMatchObject({
                result: { networkId, ledgerApi: 'http://127.0.0.1:5003' },
            })
        })

        it('records the requesting origin on a prepared transaction', async () => {
            const postWithRetry = vi
                .spyOn(LedgerClient.prototype, 'postWithRetry')
                .mockResolvedValue({
                    preparedTransaction: 'prepared-tx',
                    preparedTransactionHash: 'prepared-hash',
                })
            const sink = { send: vi.fn(), close: vi.fn() }
            subscribeNotifications(
                service,
                { sessionId, userId: authContext.userId },
                sink
            )

            const response = await dispatcher.request(
                request('prepareExecute', {
                    commandId: 'command-1',
                    commands: [{ CreateCommand: {} }],
                }),
                origin
            )

            expect(response).toEqual({ jsonrpc: '2.0', id: 7, result: null })
            expect(postWithRetry).toHaveBeenCalledWith(
                '/v2/interactive-submission/prepare',
                expect.objectContaining({
                    commandId: 'command-1',
                    actAs: [wallet.partyId],
                })
            )
            const [queued] = await approvalRequestsItem.getValue()
            expect(queued).toEqual({
                transactionId: expect.any(String),
                commandId: 'command-1',
            })
            expect(
                await store.getTransaction(queued!.transactionId)
            ).toMatchObject({
                status: 'pending',
                commandId: 'command-1',
                preparedTransaction: 'prepared-tx',
                origin,
            })
            expect(sink.send).toHaveBeenCalledWith('txChanged', [
                { status: 'pending', commandId: 'command-1' },
            ])
        })
    })
})
