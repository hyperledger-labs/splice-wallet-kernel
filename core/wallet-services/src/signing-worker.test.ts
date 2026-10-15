// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Logger } from 'pino'
import type {
    Network,
    Store,
    Transaction,
    Wallet,
} from '@canton-network/core-wallet-store'
import { SigningProvider } from '@canton-network/core-signing-lib'
import {
    SigningWorker,
    type SigningWorkerRunContext,
    type SigningWorkerRunContextResolver,
} from './signing-worker.js'
import { TransactionService } from './transaction-service.js'
import type { Notifier } from './notification/index.js'
import { createTestLogger } from './test-utils.js'

const mocks = vi.hoisted(() => ({
    signAndExecute: vi.fn(),
}))

vi.mock('./transaction-service.js', () => ({
    TransactionService: vi.fn(function TransactionServiceMock() {
        return { signAndExecute: mocks.signAndExecute }
    }),
}))

const network: Network = {
    id: 'net-m2m',
    name: 'm2m',
    description: '',
    synchronizerId: 'sync::fp',
    identityProviderId: 'idp1',
    ledgerApi: { baseUrl: 'http://ledger' },
    auth: {
        method: 'authorization_code',
        clientId: 'user',
        audience: 'aud',
        scope: 'scope',
    },
    serviceAccountAuth: {
        method: 'client_credentials',
        clientId: 'svc',
        clientSecret: 'secret',
        audience: 'aud',
        scope: 'scope',
    },
}

const wallet: Wallet = {
    primary: true,
    partyId: 'party::ns',
    status: 'allocated',
    hint: 'party',
    publicKey: 'pk',
    namespace: 'ns',
    networkId: 'net-m2m',
    signingProviderId: SigningProvider.FIREBLOCKS,
    rights: [],
}

const aliceWallet: Wallet = {
    primary: false,
    partyId: 'alice::ns2',
    status: 'allocated',
    hint: 'alice',
    publicKey: 'pk2',
    namespace: 'ns2',
    networkId: 'net-m2m',
    signingProviderId: SigningProvider.FIREBLOCKS,
    rights: [],
}

const pendingTransaction: Transaction = {
    id: 'tx-1',
    commandId: 'cmd-1',
    status: 'pending',
    preparedTransaction: 'blob',
    preparedTransactionHash: 'hash',
    externalTxId: 'ext-1',
    origin: null,
    userId: 'user-1',
    networkId: 'net-m2m',
}

const authContext = { userId: 'service_account', accessToken: 'abc' }
const signingDrivers = {}

function createDeferred<T>() {
    let resolve!: (value: T) => void
    const promise = new Promise<T>((res) => {
        resolve = res
    })
    return { promise, resolve }
}

function createScopedStore(overrides: Record<string, unknown> = {}) {
    return {
        getPrimaryWallet: vi.fn().mockResolvedValue(wallet),
        getAllWallets: vi.fn().mockResolvedValue([wallet, aliceWallet]),
        getTransaction: vi.fn().mockImplementation(async (id: string) => ({
            ...pendingTransaction,
            id,
        })),
        ...overrides,
    }
}

function createWorker(
    options: {
        pending?: Transaction[]
        listAllPendingTransactions?: ReturnType<typeof vi.fn>
        scopedStore?: ReturnType<typeof createScopedStore>
        resolveRunContext?: SigningWorkerRunContextResolver
    } = {}
) {
    const scopedStore = options.scopedStore ?? createScopedStore()
    const notifier = { emit: vi.fn() } as unknown as Notifier
    const runContext: SigningWorkerRunContext = {
        authContext,
        store: scopedStore as unknown as Store,
        network,
        notifier,
    }
    const store = {
        listAllPendingTransactions:
            options.listAllPendingTransactions ??
            vi.fn().mockResolvedValue(options.pending ?? [pendingTransaction]),
    }
    const resolveRunContext = vi.fn(
        options.resolveRunContext ?? (async () => runContext)
    )
    const logger = createTestLogger()

    return {
        worker: new SigningWorker({
            intervalMs: 1000,
            store,
            resolveRunContext,
            signingDrivers,
            hashingSchemeVersion: 'HASHING_SCHEME_VERSION_V3',
            logger,
        }),
        store,
        scopedStore,
        notifier,
        resolveRunContext,
        logger: logger as Logger & {
            info: ReturnType<typeof vi.fn>
            warn: ReturnType<typeof vi.fn>
            error: ReturnType<typeof vi.fn>
            debug: ReturnType<typeof vi.fn>
        },
    }
}

describe('SigningWorker', () => {
    beforeEach(() => {
        vi.mocked(TransactionService).mockClear()
        mocks.signAndExecute.mockReset()
        mocks.signAndExecute.mockResolvedValue({ commandId: 'cmd-1' })
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('completes pending external transactions with a primary wallet', async () => {
        const { worker, logger } = createWorker()

        await worker.tick()

        expect(mocks.signAndExecute).toHaveBeenCalledOnce()
        expect(mocks.signAndExecute.mock.calls[0][2].partyId).toBe('party::ns')
        expect(logger.info).toHaveBeenCalledWith(
            expect.objectContaining({
                transactionId: 'tx-1',
                partyId: 'party::ns',
                result: { commandId: 'cmd-1' },
            }),
            'Signing worker completed service account transaction'
        )
    })

    it('uses a non-primary wallet when actAs payload is present', async () => {
        const { worker } = createWorker({
            pending: [
                {
                    ...pendingTransaction,
                    payload: { actAs: ['alice::ns2'] },
                },
            ],
        })

        await worker.tick()

        expect(mocks.signAndExecute).toHaveBeenCalledOnce()
        expect(mocks.signAndExecute.mock.calls[0][2].partyId).toBe('alice::ns2')
    })

    it('skips pending transactions without an externalTxId', async () => {
        const { worker, resolveRunContext } = createWorker({
            pending: [{ ...pendingTransaction, externalTxId: undefined }],
        })

        await worker.tick()

        expect(resolveRunContext).not.toHaveBeenCalled()
        expect(mocks.signAndExecute).not.toHaveBeenCalled()
    })

    it('passes the transaction with userId and networkId to the resolver', async () => {
        const { worker, resolveRunContext } = createWorker()

        await worker.tick()

        expect(resolveRunContext).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'tx-1',
                userId: 'user-1',
                networkId: 'net-m2m',
            })
        )
    })

    it('skips when the resolver returns no run context', async () => {
        const { worker, scopedStore, logger } = createWorker({
            resolveRunContext: async () => undefined,
        })

        await worker.tick()

        expect(scopedStore.getTransaction).not.toHaveBeenCalled()
        expect(TransactionService).not.toHaveBeenCalled()
        expect(mocks.signAndExecute).not.toHaveBeenCalled()
        expect(logger.debug).toHaveBeenCalledWith(
            { runContext: undefined, transactionId: 'tx-1' },
            'Skipping signing worker tick: no run context'
        )
    })

    it('skips when the re-read transaction is no longer pending', async () => {
        const scopedStore = createScopedStore({
            getTransaction: vi.fn().mockResolvedValue({
                ...pendingTransaction,
                status: 'executed',
            }),
        })
        const { worker, logger } = createWorker({ scopedStore })

        await worker.tick()

        expect(mocks.signAndExecute).not.toHaveBeenCalled()
        expect(logger.debug).toHaveBeenCalledWith(
            { refreshedTx: { ...pendingTransaction, status: 'executed' } },
            'Skipping signing worker tick: transaction no longer pending'
        )
    })

    it('skips when the submitting wallet cannot be resolved', async () => {
        const scopedStore = createScopedStore({
            getPrimaryWallet: vi.fn().mockResolvedValue(undefined),
        })
        const { worker, logger } = createWorker({ scopedStore })

        await worker.tick()

        expect(scopedStore.getTransaction).not.toHaveBeenCalled()
        expect(mocks.signAndExecute).not.toHaveBeenCalled()
        expect(logger.warn).toHaveBeenCalledWith(
            {
                userId: 'user-1',
                networkId: 'net-m2m',
                transactionId: 'tx-1',
                commandId: 'cmd-1',
            },
            'Skipping signing worker tick: could not deduce submitting wallet from transaction payload'
        )
    })

    it('logs a pending result as still awaiting external signing', async () => {
        mocks.signAndExecute.mockResolvedValue({
            status: 'pending',
            externalTxId: 'ext-1',
        })
        const { worker, logger } = createWorker()

        await expect(worker.tick()).resolves.toBeUndefined()

        expect(logger.info).toHaveBeenCalledWith(
            {
                userId: 'user-1',
                networkId: 'net-m2m',
                transactionId: 'tx-1',
                commandId: 'cmd-1',
                externalTxId: 'ext-1',
                signingProviderId: SigningProvider.FIREBLOCKS,
            },
            'Signing worker: transaction still awaiting external signing'
        )
        expect(logger.error).not.toHaveBeenCalled()
    })

    it('continues with the next row when signAndExecute fails', async () => {
        const error = new Error('boom')
        mocks.signAndExecute
            .mockRejectedValueOnce(error)
            .mockResolvedValueOnce({ commandId: 'cmd-2' })
        const { worker, logger } = createWorker({
            pending: [
                pendingTransaction,
                {
                    ...pendingTransaction,
                    id: 'tx-2',
                    commandId: 'cmd-2',
                    externalTxId: 'ext-2',
                },
            ],
        })

        await worker.tick()

        expect(mocks.signAndExecute).toHaveBeenCalledTimes(2)
        expect(mocks.signAndExecute.mock.calls[1][3].id).toBe('tx-2')
        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({ err: error, transactionId: 'tx-1' }),
            'Signing worker failed to complete service account transaction'
        )
        expect(logger.info).toHaveBeenCalledWith(
            expect.objectContaining({ transactionId: 'tx-2' }),
            'Signing worker completed service account transaction'
        )
    })

    it('logs a failed listing and resets the running flag', async () => {
        const error = new Error('db down')
        const listAllPendingTransactions = vi
            .fn()
            .mockRejectedValueOnce(error)
            .mockResolvedValueOnce([pendingTransaction])
        const { worker, logger } = createWorker({
            listAllPendingTransactions,
        })

        await expect(worker.tick()).resolves.toBeUndefined()

        expect(logger.error).toHaveBeenCalledWith(
            { err: error },
            'Signing worker tick failed'
        )

        await worker.tick()

        expect(listAllPendingTransactions).toHaveBeenCalledTimes(2)
        expect(mocks.signAndExecute).toHaveBeenCalledOnce()
    })

    it('ignores a tick started while another tick is in flight', async () => {
        const deferred = createDeferred<Transaction[]>()
        const listAllPendingTransactions = vi
            .fn()
            .mockReturnValue(deferred.promise)
        const { worker } = createWorker({ listAllPendingTransactions })

        const first = worker.tick()
        await worker.tick()

        expect(listAllPendingTransactions).toHaveBeenCalledOnce()

        deferred.resolve([pendingTransaction])
        await first

        expect(mocks.signAndExecute).toHaveBeenCalledOnce()
    })

    it('builds TransactionService with the scoped store and notifier from the resolver', async () => {
        const { worker, scopedStore, notifier } = createWorker()

        await worker.tick()

        expect(TransactionService).toHaveBeenCalledOnce()
        const [store, , drivers, usedNotifier, hashingSchemeVersion] =
            vi.mocked(TransactionService).mock.calls[0]
        expect(store).toBe(scopedStore)
        expect(drivers).toBe(signingDrivers)
        expect(usedNotifier).toBe(notifier)
        expect(hashingSchemeVersion).toBe('HASHING_SCHEME_VERSION_V3')
        expect(mocks.signAndExecute).toHaveBeenCalledWith(
            authContext,
            network,
            wallet,
            expect.objectContaining({ id: 'tx-1', status: 'pending' })
        )
    })

    it('starts a single timer when start() is called twice and stop() clears it', async () => {
        vi.useFakeTimers()
        const { worker, store, logger } = createWorker({ pending: [] })

        worker.start()
        worker.start()

        expect(logger.info).toHaveBeenCalledTimes(2)
        expect(logger.info).toHaveBeenNthCalledWith(
            1,
            'Starting signing worker'
        )
        expect(logger.info).toHaveBeenNthCalledWith(
            2,
            { intervalMs: 1000 },
            'Signing worker started'
        )

        await vi.advanceTimersByTimeAsync(1000)
        expect(store.listAllPendingTransactions).toHaveBeenCalledOnce()

        worker.stop()

        await vi.advanceTimersByTimeAsync(5000)
        expect(store.listAllPendingTransactions).toHaveBeenCalledOnce()
    })
})
