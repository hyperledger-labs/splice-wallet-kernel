// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Logger } from 'pino'
import type { LedgerClient } from '@canton-network/core-ledger-client'
import type { AuthContext } from '@canton-network/core-wallet-auth'
import type {
    Network,
    Store,
    Transaction,
    Wallet,
} from '@canton-network/core-wallet-store'
import {
    SigningProvider,
    type SigningDriverInterface,
} from '@canton-network/core-signing-lib'
import type { Notifier } from './notification/index.js'
import { TransactionService } from './transaction-service.js'
import { createTestLogger } from './test-utils.js'

const authContext: AuthContext = {
    userId: 'user-1',
    accessToken: 'access-token-1',
}

const authContextWithEmail: AuthContext = {
    ...authContext,
    email: 'user@example.com',
}

const wallet: Wallet = {
    primary: true,
    partyId: 'party::namespace',
    status: 'allocated',
    hint: 'party',
    signingProviderId: SigningProvider.WALLET_KERNEL,
    publicKey: 'wallet-public-key',
    namespace: 'namespace',
    userId: 'user-1',
    networkId: 'network1',
    rights: [],
}

const pendingTransaction: Transaction = {
    id: 'tx-1',
    commandId: 'cmd-1',
    status: 'pending',
    preparedTransaction: 'prepared-tx',
    preparedTransactionHash: 'tx-hash',
    origin: 'https://dapp.example',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
}

const awaitingTransaction: Transaction = {
    ...pendingTransaction,
    status: 'awaiting-signature',
    externalTxId: 'external-tx-1',
}

const signedWithExternal: Transaction = {
    ...pendingTransaction,
    status: 'signed',
    externalTxId: 'external-tx-1',
    signedAt: new Date('2026-01-01T00:00:00.000Z'),
}

const signedTransaction: Transaction = {
    ...pendingTransaction,
    status: 'signed',
    signedAt: new Date('2026-01-01T00:01:00.000Z'),
}

const executedTransaction: Transaction = {
    ...pendingTransaction,
    status: 'executed',
}

const signParams = {
    transactionId: pendingTransaction.id,
    partyId: wallet.partyId,
}

const executeParams = {
    transactionId: pendingTransaction.id,
    partyId: wallet.partyId,
}

const postWithRetry = vi.fn().mockResolvedValue({ updateId: 'ledger-update-1' })
const ledgerClient = {
    postWithRetry,
    getSynchronizerId: vi.fn(),
} as unknown as LedgerClient

const network: Network = {
    id: 'network1',
    name: 'testnet',
    synchronizerId: 'sync::fingerprint',
    description: 'Test',
    identityProviderId: 'idp1',
    ledgerApi: { baseUrl: 'http://ledger.test' },
    auth: {
        method: 'authorization_code',
        clientId: 'cid',
        scope: 'scope',
        audience: 'aud',
    },
}

function walletWithProvider(signingProviderId: SigningProvider): Wallet {
    return { ...wallet, signingProviderId }
}

function createDriver(options: {
    signTransaction?: ReturnType<typeof vi.fn>
    getTransaction?: ReturnType<typeof vi.fn>
}): SigningDriverInterface {
    return {
        controller: vi.fn().mockReturnValue({
            signTransaction:
                options.signTransaction ??
                vi.fn().mockResolvedValue({ signature: 'driver-signature' }),
            getTransaction:
                options.getTransaction ?? vi.fn().mockResolvedValue({}),
        }),
    } as unknown as SigningDriverInterface
}

function createStore(
    transaction: Transaction | undefined = pendingTransaction,
    ...subsequent: Array<Transaction | undefined>
): Store & {
    getTransaction: ReturnType<typeof vi.fn>
    setTransactionSigned: ReturnType<typeof vi.fn>
    setTransactionStatus: ReturnType<typeof vi.fn>
} {
    const getTransaction = vi.fn().mockResolvedValue(transaction)
    for (const tx of subsequent) {
        getTransaction.mockResolvedValueOnce(tx)
    }
    if (subsequent.length > 0) {
        getTransaction.mockReset()
        getTransaction.mockResolvedValue(subsequent[subsequent.length - 1])
        getTransaction.mockResolvedValueOnce(transaction)
        for (const tx of subsequent) {
            getTransaction.mockResolvedValueOnce(tx)
        }
    }
    return {
        getTransaction,
        setTransactionSigned: vi.fn().mockResolvedValue(true),
        setTransactionStatus: vi.fn().mockResolvedValue(true),
    } as unknown as Store & {
        getTransaction: ReturnType<typeof vi.fn>
        setTransactionSigned: ReturnType<typeof vi.fn>
        setTransactionStatus: ReturnType<typeof vi.fn>
    }
}

function createService(
    store: Store,
    drivers: Partial<Record<SigningProvider, SigningDriverInterface>>,
    notifier: Notifier,
    logger: Logger
) {
    return new TransactionService(
        store,
        logger,
        drivers,
        notifier,
        'HASHING_SCHEME_VERSION_V3'
    )
}

const nextTurn = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

function gateNextStatusWrite(setTransactionStatus: ReturnType<typeof vi.fn>) {
    const writeStarted = Promise.withResolvers<void>()
    const writeGate = Promise.withResolvers<void>()
    setTransactionStatus.mockImplementationOnce(async () => {
        writeStarted.resolve()
        await writeGate.promise
        return true
    })
    return { writeStarted, writeGate }
}

function trackSettlement(promise: Promise<unknown>) {
    const state = { settled: false }
    const markSettled = () => {
        state.settled = true
    }
    void promise.then(markSettled, markSettled)
    return state
}

describe('TransactionService', () => {
    let logger: Logger
    let notifier: Notifier
    let emit: ReturnType<typeof vi.fn>

    beforeEach(() => {
        logger = createTestLogger()
        emit = vi.fn()
        notifier = { emit } as unknown as Notifier
    })

    describe('sign', () => {
        describe('participant', () => {
            it('returns a signed result and persists signed status', async () => {
                const store = createStore()
                const service = createService(
                    store,
                    {
                        [SigningProvider.PARTICIPANT]: createDriver({
                            signTransaction: vi.fn().mockResolvedValue({
                                status: 'signed',
                                signature: 'none',
                                signedBy: 'namespace',
                            }),
                        }),
                    },
                    notifier,
                    logger
                )
                const participantWallet = walletWithProvider(
                    SigningProvider.PARTICIPANT
                )

                const result = await service.sign(
                    authContext,
                    participantWallet,
                    signParams
                )

                expect(result).toEqual({
                    status: 'signed',
                    signature: 'none',
                    signedBy: wallet.namespace,
                    partyId: wallet.partyId,
                })
                expect(store.getTransaction).toHaveBeenCalledWith(
                    pendingTransaction.id
                )
                expect(store.setTransactionSigned).toHaveBeenCalledWith(
                    pendingTransaction.id,
                    expect.any(Date),
                    undefined,
                    { expectedStatus: 'pending' }
                )
                expect(emit).toHaveBeenCalledWith(
                    'txChanged',
                    expect.objectContaining({
                        id: pendingTransaction.id,
                        status: 'signed',
                        payload: {
                            signature: 'none',
                            signedBy: wallet.namespace,
                            party: wallet.partyId,
                        },
                    })
                )
            })
        })

        describe('wallet-kernel', () => {
            it('signs the transaction and persists the signed state', async () => {
                const signTransaction = vi.fn().mockResolvedValue({
                    status: 'signed',
                    signature: 'kernel-signature',
                })
                const store = createStore()
                const service = createService(
                    store,
                    {
                        [SigningProvider.WALLET_KERNEL]: createDriver({
                            signTransaction,
                        }),
                    },
                    notifier,
                    logger
                )

                const result = await service.sign(
                    authContext,
                    wallet,
                    signParams
                )

                expect(signTransaction).toHaveBeenCalledWith({
                    tx: pendingTransaction.preparedTransaction,
                    txHash: pendingTransaction.preparedTransactionHash,
                    keyIdentifier: { publicKey: wallet.publicKey },
                })
                expect(store.setTransactionSigned).toHaveBeenCalledWith(
                    pendingTransaction.id,
                    expect.any(Date),
                    undefined,
                    { expectedStatus: 'pending' }
                )
                expect(emit).toHaveBeenCalledWith(
                    'txChanged',
                    expect.objectContaining({
                        id: pendingTransaction.id,
                        status: 'signed',
                        payload: {
                            signature: 'kernel-signature',
                            signedBy: wallet.namespace,
                            party: wallet.partyId,
                        },
                    })
                )
                expect(result).toEqual({
                    status: 'signed',
                    signature: 'kernel-signature',
                    signedBy: wallet.namespace,
                    partyId: wallet.partyId,
                })
            })

            it('throws when the wallet-kernel driver is missing', async () => {
                const service = createService(
                    createStore(),
                    {},
                    notifier,
                    logger
                )

                await expect(
                    service.sign(authContext, wallet, signParams)
                ).rejects.toThrow('No driver found for wallet-kernel')
            })

            it('throws when the transaction does not exist', async () => {
                const store = createStore()
                store.getTransaction.mockResolvedValue(undefined)
                const service = createService(
                    store,
                    {
                        [SigningProvider.WALLET_KERNEL]: createDriver({}),
                    },
                    notifier,
                    logger
                )

                await expect(
                    service.sign(authContext, wallet, signParams)
                ).rejects.toThrow('Transaction not found with id: tx-1')
            })

            it('throws when the driver returns an RPC error', async () => {
                const signTransaction = vi.fn().mockResolvedValue({
                    error: 'access_denied',
                    error_description: 'Signing rejected',
                })
                const service = createService(
                    createStore(),
                    {
                        [SigningProvider.WALLET_KERNEL]: createDriver({
                            signTransaction,
                        }),
                    },
                    notifier,
                    logger
                )

                await expect(
                    service.sign(authContext, wallet, signParams)
                ).rejects.toThrow('Error from signing driver: Signing rejected')
            })
        })

        describe('blockdaemon', () => {
            const blockdaemonWallet = walletWithProvider(
                SigningProvider.BLOCKDAEMON
            )

            it('throws when email is missing from auth context', async () => {
                const service = createService(
                    createStore(),
                    {
                        [SigningProvider.BLOCKDAEMON]: createDriver({}),
                    },
                    notifier,
                    logger
                )

                await expect(
                    service.sign(authContext, blockdaemonWallet, signParams)
                ).rejects.toThrow(
                    'Email is required for Blockdaemon wallet allocation'
                )
            })

            it('starts signing when there is no external transaction id yet', async () => {
                const signTransaction = vi.fn().mockResolvedValue({
                    status: 'pending',
                    txId: 'external-tx-1',
                })
                const store = createStore()
                const service = createService(
                    store,
                    {
                        [SigningProvider.BLOCKDAEMON]: createDriver({
                            signTransaction,
                        }),
                    },
                    notifier,
                    logger
                )

                const result = await service.sign(
                    authContextWithEmail,
                    blockdaemonWallet,
                    signParams
                )

                expect(signTransaction).toHaveBeenCalledWith(
                    expect.objectContaining({
                        tx: pendingTransaction.preparedTransaction,
                        internalTxId: expect.stringMatching(/^[0-9a-f]{16}$/),
                    })
                )
                expect(store.setTransactionStatus).toHaveBeenCalledWith(
                    pendingTransaction.id,
                    'awaiting-signature',
                    { externalTxId: 'external-tx-1' },
                    { expectedStatus: 'pending' }
                )
                expect(result).toEqual({
                    status: 'pending',
                    externalTxId: 'external-tx-1',
                    partyId: wallet.partyId,
                })
            })

            it('polls the provider and persists signed status', async () => {
                const getTransaction = vi.fn().mockResolvedValue({
                    status: 'signed',
                    txId: 'external-tx-1',
                    signature: 'bd-signature',
                })
                const store = createStore(awaitingTransaction)
                const service = createService(
                    store,
                    {
                        [SigningProvider.BLOCKDAEMON]: createDriver({
                            getTransaction,
                        }),
                    },
                    notifier,
                    logger
                )

                const result = await service.refreshTransaction(
                    authContextWithEmail,
                    blockdaemonWallet,
                    pendingTransaction.id
                )

                expect(getTransaction).toHaveBeenCalledWith({
                    userId: authContextWithEmail.email,
                    txId: 'external-tx-1',
                })

                expect(store.setTransactionSigned).toHaveBeenCalledWith(
                    pendingTransaction.id,
                    expect.any(Date),
                    'external-tx-1',
                    { expectedStatus: 'awaiting-signature' }
                )
                expect(result).toMatchObject({
                    status: 'signed',
                    externalTxId: 'external-tx-1',
                })
            })
        })

        describe('fireblocks', () => {
            it('returns a base64 signature when signing completes', async () => {
                const signature = btoa('fireblocks-signature')
                const signTransaction = vi.fn().mockResolvedValue({
                    status: 'signed',
                    txId: 'fb-tx-1',
                    signature,
                })
                const store = createStore()
                const service = createService(
                    store,
                    {
                        [SigningProvider.FIREBLOCKS]: createDriver({
                            signTransaction,
                        }),
                    },
                    notifier,
                    logger
                )

                const result = await service.sign(
                    authContext,
                    walletWithProvider(SigningProvider.FIREBLOCKS),
                    signParams
                )

                expect(signTransaction).toHaveBeenCalledWith(
                    expect.objectContaining({
                        userId: authContext.userId,
                        txHash: 'tx-hash',
                    })
                )
                expect(result).toMatchObject({
                    status: 'signed',
                    signature,
                    externalTxId: 'fb-tx-1',
                })
            })
        })

        describe('dfns', () => {
            it('returns the driver signature when signing completes', async () => {
                const signTransaction = vi.fn().mockResolvedValue({
                    status: 'signed',
                    txId: 'dfns-tx-1',
                    signature: 'dfns-signature',
                })
                const store = createStore()
                const service = createService(
                    store,
                    {
                        [SigningProvider.DFNS]: createDriver({
                            signTransaction,
                        }),
                    },
                    notifier,
                    logger
                )

                const result = await service.sign(
                    authContext,
                    walletWithProvider(SigningProvider.DFNS),
                    signParams
                )

                expect(result).toEqual({
                    status: 'signed',
                    signature: 'dfns-signature',
                    signedBy: wallet.namespace,
                    partyId: wallet.partyId,
                    externalTxId: 'dfns-tx-1',
                })
            })
        })

        describe('securosys', () => {
            it('starts signing and persists the TSB request id when signing is pending', async () => {
                const signTransaction = vi.fn().mockResolvedValue({
                    status: 'pending',
                    txId: 'tsb-request-1',
                })
                const store = createStore()
                const service = createService(
                    store,
                    {
                        [SigningProvider.SECUROSYS]: createDriver({
                            signTransaction,
                        }),
                    },
                    notifier,
                    logger
                )

                const result = await service.sign(
                    authContext,
                    walletWithProvider(SigningProvider.SECUROSYS),
                    signParams
                )

                // The Securosys driver derives its key label from the public key
                expect(signTransaction).toHaveBeenCalledWith({
                    tx: pendingTransaction.preparedTransaction,
                    txHash: pendingTransaction.preparedTransactionHash,
                    keyIdentifier: { publicKey: wallet.publicKey },
                })
                expect(store.setTransactionStatus).toHaveBeenCalledWith(
                    pendingTransaction.id,
                    'awaiting-signature',
                    { externalTxId: 'tsb-request-1' },
                    { expectedStatus: 'pending' }
                )
                expect(result).toEqual({
                    status: 'pending',
                    externalTxId: 'tsb-request-1',
                    partyId: wallet.partyId,
                })
            })

            it('polls the TSB request by id only', async () => {
                const getTransaction = vi.fn().mockResolvedValue({
                    status: 'signed',
                    txId: 'external-tx-1',
                    signature: 'tsb-signature',
                })
                const store = createStore(awaitingTransaction)
                const service = createService(
                    store,
                    {
                        [SigningProvider.SECUROSYS]: createDriver({
                            getTransaction,
                        }),
                    },
                    notifier,
                    logger
                )

                const result = await service.refreshTransaction(
                    authContext,
                    walletWithProvider(SigningProvider.SECUROSYS),
                    pendingTransaction.id
                )

                expect(getTransaction).toHaveBeenCalledWith({
                    txId: 'external-tx-1',
                })
                expect(result).toEqual({
                    status: 'signed',
                    externalTxId: 'external-tx-1',
                })
            })
        })

        describe('bitgo', () => {
            it('returns the driver signature when signing completes', async () => {
                const signTransaction = vi.fn().mockResolvedValue({
                    status: 'signed',
                    txId: 'bitgo-tx-1',
                    signature: 'bitgo-signature',
                })
                const store = createStore()
                const service = createService(
                    store,
                    {
                        [SigningProvider.BITGO]: createDriver({
                            signTransaction,
                        }),
                    },
                    notifier,
                    logger
                )

                const result = await service.sign(
                    authContext,
                    walletWithProvider(SigningProvider.BITGO),
                    signParams
                )

                expect(result).toEqual({
                    status: 'signed',
                    signature: 'bitgo-signature',
                    signedBy: wallet.namespace,
                    partyId: wallet.partyId,
                    externalTxId: 'bitgo-tx-1',
                })
            })

            it('returns pending status when signing is in progress', async () => {
                const signTransaction = vi.fn().mockResolvedValue({
                    status: 'pending',
                    txId: 'bitgo-tx-1',
                })
                const store = createStore()
                const service = createService(
                    store,
                    {
                        [SigningProvider.BITGO]: createDriver({
                            signTransaction,
                        }),
                    },
                    notifier,
                    logger
                )

                const result = await service.sign(
                    authContext,
                    walletWithProvider(SigningProvider.BITGO),
                    signParams
                )

                expect(result).toEqual({
                    status: 'pending',
                    externalTxId: 'bitgo-tx-1',
                    partyId: wallet.partyId,
                })
                expect(store.setTransactionStatus).toHaveBeenCalledWith(
                    pendingTransaction.id,
                    'awaiting-signature',
                    { externalTxId: 'bitgo-tx-1' },
                    { expectedStatus: 'pending' }
                )
            })

            it('polls getTransaction when externalTxId is already set', async () => {
                const getTransaction = vi.fn().mockResolvedValue({
                    status: 'signed',
                    txId: 'bitgo-tx-1',
                    signature: 'bitgo-signature',
                })
                const store = createStore({
                    ...awaitingTransaction,
                    externalTxId: 'bitgo-tx-1',
                })
                const service = createService(
                    store,
                    {
                        [SigningProvider.BITGO]: createDriver({
                            getTransaction,
                        }),
                    },
                    notifier,
                    logger
                )

                const result = await service.refreshTransaction(
                    authContext,
                    walletWithProvider(SigningProvider.BITGO),
                    'bitgo-tx-1'
                )

                expect(getTransaction).toHaveBeenCalledWith(
                    expect.objectContaining({ txId: 'bitgo-tx-1' })
                )

                expect(result).toEqual({
                    status: 'signed',
                    externalTxId: 'bitgo-tx-1',
                })
            })

            it('throws when BitGo signing driver is not available', async () => {
                const service = createService(
                    createStore(),
                    {},
                    notifier,
                    logger
                )
                await expect(
                    service.sign(
                        authContext,
                        walletWithProvider(SigningProvider.BITGO),
                        signParams
                    )
                ).rejects.toThrow('No driver found for bitgo')
            })

            it('does not emit when concurrent polling service already moved the transaction on', async () => {
                const getTransaction = vi.fn().mockResolvedValue({
                    status: 'signed',
                    txId: 'external-tx-id',
                    signature: 'sig',
                })

                const store = createStore(
                    awaitingTransaction,
                    executedTransaction
                )
                store.setTransactionSigned.mockResolvedValue(false)

                const service = createService(
                    store,
                    {
                        [SigningProvider.BITGO]: createDriver({
                            getTransaction,
                        }),
                    },
                    notifier,
                    logger
                )

                const result = await service.refreshTransaction(
                    authContext,
                    walletWithProvider(SigningProvider.BITGO),
                    pendingTransaction.id
                )

                expect(result).toEqual({ status: 'executed' })
                expect(emit).not.toHaveBeenCalled()
            })
        })

        it.each([
            {
                name: 'participant',
                provider: SigningProvider.PARTICIPANT,
                auth: authContext,
            },
            {
                name: 'wallet-kernel',
                provider: SigningProvider.WALLET_KERNEL,
                auth: authContext,
            },
            {
                name: 'blockdaemon',
                provider: SigningProvider.BLOCKDAEMON,
                auth: authContextWithEmail,
            },
            {
                name: 'fireblocks',
                provider: SigningProvider.FIREBLOCKS,
                auth: authContext,
            },
            {
                name: 'dfns',
                provider: SigningProvider.DFNS,
                auth: authContext,
            },
            {
                name: 'securosys',
                provider: SigningProvider.SECUROSYS,
                auth: authContext,
            },
            {
                name: 'bitgo',
                provider: SigningProvider.BITGO,
                auth: authContext,
            },
        ])(
            'rejects signing an already executed transaction for $name',
            async ({ provider, auth }) => {
                const store = createStore(executedTransaction)
                const service = createService(
                    store,
                    {
                        [provider]: createDriver({}),
                    },
                    notifier,
                    logger
                )
                const providerWallet = walletWithProvider(provider)

                await expect(
                    service.sign(auth, providerWallet, signParams)
                ).rejects.toThrow('Cannot sign an already executed transaction')
                expect(store.setTransactionSigned).not.toHaveBeenCalled()
                expect(store.setTransactionStatus).not.toHaveBeenCalled()
            }
        )
    })

    describe('execute', () => {
        it.each([
            'pending',
            'failed',
            'executed',
            'awaiting-signature',
        ] as const)(
            'throws when execute is called for a %s transaction',
            async (status) => {
                const service = createService(
                    createStore(),
                    {},
                    notifier,
                    logger
                )

                const transaction = {
                    ...pendingTransaction,
                    status,
                }

                await expect(
                    service.execute(
                        authContext.userId,
                        wallet,
                        transaction,
                        executeParams,
                        ledgerClient,
                        authContext
                    )
                ).rejects.toThrow(
                    `Cannot execute a ${status} transaction. Expected status: signed.`
                )
            }
        )

        describe('participant', () => {
            it('submits the prepared transaction to the ledger', async () => {
                const participantWallet = walletWithProvider(
                    SigningProvider.PARTICIPANT
                )
                const transaction = {
                    ...signedTransaction,
                    payload: {
                        commandId: pendingTransaction.commandId,
                        commands: [],
                    },
                }
                const store = createStore(transaction)
                const service = createService(store, {}, notifier, logger)

                const result = await service.execute(
                    authContext.userId,
                    participantWallet,
                    transaction,
                    executeParams,
                    ledgerClient,
                    authContext,
                    network
                )

                expect(postWithRetry).toHaveBeenCalledWith(
                    '/v2/commands/submit-and-wait',
                    expect.objectContaining({
                        commandId: pendingTransaction.commandId,
                        userId: authContext.userId,
                        synchronizerId: network.synchronizerId,
                    })
                )
                expect(store.setTransactionStatus).toHaveBeenCalledWith(
                    pendingTransaction.id,
                    'executed',
                    { payload: { updateId: 'ledger-update-1' } }
                )
                expect(result).toEqual({ updateId: 'ledger-update-1' })
            })
        })

        describe('external signing providers', () => {
            it.each([
                SigningProvider.WALLET_KERNEL,
                SigningProvider.BLOCKDAEMON,
                SigningProvider.FIREBLOCKS,
                SigningProvider.DFNS,
                SigningProvider.SECUROSYS,
            ])(
                'executes with the provided signature for %s',
                async (signingProviderId) => {
                    const getTransaction = vi.fn().mockResolvedValue({
                        status: 'signed',
                        signature: 'sig',
                    })

                    const store = createStore(signedWithExternal)

                    const service = createService(
                        store,
                        {
                            [signingProviderId]: createDriver({
                                getTransaction,
                            }),
                        },
                        notifier,
                        logger
                    )

                    const postWithRetry = vi
                        .fn()
                        .mockResolvedValue({ updateId: 'external-update-1' })

                    const providerAuthContext =
                        signingProviderId === SigningProvider.BLOCKDAEMON
                            ? authContextWithEmail
                            : authContext

                    let wkSignedTx = undefined
                    if (signingProviderId === SigningProvider.WALLET_KERNEL) {
                        wkSignedTx = { ...signedWithExternal }
                        delete wkSignedTx.externalTxId
                    }

                    const result = await service.execute(
                        providerAuthContext.userId,
                        walletWithProvider(signingProviderId),
                        wkSignedTx || signedWithExternal,
                        executeParams,
                        { postWithRetry } as unknown as LedgerClient,
                        providerAuthContext,
                        network
                    )

                    expect(postWithRetry).toHaveBeenCalledWith(
                        '/v2/interactive-submission/executeAndWait',
                        expect.objectContaining({
                            userId: authContext.userId,

                            preparedTransaction:
                                pendingTransaction.preparedTransaction,
                            submissionId: pendingTransaction.commandId,
                            partySignatures: expect.objectContaining({
                                signatures: [
                                    expect.objectContaining({
                                        party: wallet.partyId,
                                    }),
                                ],
                            }),
                        }),
                        {
                            retries: 20,
                            delayMs: 3000,
                            cantonErrorKeys: [
                                'SEQUENCER_REQUEST_FAILED',
                                'SEQUENCER_BACKPRESSURE',
                                'SUBMISSION_ALREADY_IN_FLIGHT',
                                'LOCAL_VERDICT_TIMEOUT',
                                'NOT_SEQUENCED_TIMEOUT',
                                'NO_VIEW_WITH_VALID_RECIPIENTS',
                            ],
                        }
                    )
                    expect(store.setTransactionStatus).toHaveBeenCalledWith(
                        pendingTransaction.id,
                        'executed',
                        { payload: { updateId: 'external-update-1' } }
                    )
                    expect(result).toEqual({ updateId: 'external-update-1' })
                }
            )

            it('throws an error if email is not provided in auth context for blockdaemon', async () => {
                const signingProviderId = SigningProvider.BLOCKDAEMON
                const getTransaction = vi.fn().mockResolvedValue({
                    status: 'signed',
                    signature: 'sig',
                })

                const store = createStore(signedWithExternal)

                const service = createService(
                    store,
                    {
                        [signingProviderId]: createDriver({
                            getTransaction,
                        }),
                    },
                    notifier,
                    logger
                )

                const postWithRetry = vi
                    .fn()
                    .mockResolvedValue({ updateId: 'external-update-1' })

                await expect(
                    service.execute(
                        authContext.userId,
                        walletWithProvider(signingProviderId),
                        signedWithExternal,
                        executeParams,
                        { postWithRetry } as unknown as LedgerClient,
                        authContext,
                        network
                    )
                ).rejects.toThrow(
                    'Invalid auth context (missing email) for SigningProvider BlockDaemon'
                )
            })

            it('re-signs with the wallet-kernel driver when no external transaction id is stored', async () => {
                const signTransaction = vi
                    .fn()
                    .mockResolvedValue({ signature: 'kernel-signature' })
                const getTransaction = vi.fn()
                const store = createStore(signedTransaction)
                const service = createService(
                    store,
                    {
                        [SigningProvider.WALLET_KERNEL]: createDriver({
                            signTransaction,
                            getTransaction,
                        }),
                    },
                    notifier,
                    logger
                )
                const postWithRetry = vi
                    .fn()
                    .mockResolvedValue({ updateId: 'kernel-update-1' })

                const result = await service.execute(
                    authContext.userId,
                    wallet,
                    signedTransaction,
                    executeParams,
                    { postWithRetry } as unknown as LedgerClient,
                    authContext,
                    network
                )

                expect(getTransaction).not.toHaveBeenCalled()
                expect(signTransaction).toHaveBeenCalledWith({
                    tx: signedTransaction.preparedTransaction,
                    txHash: signedTransaction.preparedTransactionHash,
                    keyIdentifier: { publicKey: wallet.publicKey },
                })
                expect(postWithRetry).toHaveBeenCalledWith(
                    '/v2/interactive-submission/executeAndWait',
                    expect.objectContaining({
                        hashingSchemeVersion: 'HASHING_SCHEME_VERSION_V3',
                        partySignatures: {
                            signatures: [
                                {
                                    party: wallet.partyId,
                                    signatures: [
                                        {
                                            signature: 'kernel-signature',
                                            signedBy: wallet.namespace,
                                            format: 'SIGNATURE_FORMAT_CONCAT',
                                            signingAlgorithmSpec:
                                                'SIGNING_ALGORITHM_SPEC_ED25519',
                                        },
                                    ],
                                },
                            ],
                        },
                    }),
                    expect.any(Object)
                )
                expect(result).toEqual({ updateId: 'kernel-update-1' })
            })

            it('throws when the wallet-kernel fallback returns no signature', async () => {
                const store = createStore(signedTransaction)
                const service = createService(
                    store,
                    {
                        [SigningProvider.WALLET_KERNEL]: createDriver({
                            signTransaction: vi.fn().mockResolvedValue({}),
                        }),
                    },
                    notifier,
                    logger
                )
                const postWithRetry = vi.fn()

                await expect(
                    service.execute(
                        authContext.userId,
                        wallet,
                        signedTransaction,
                        executeParams,
                        { postWithRetry } as unknown as LedgerClient,
                        authContext,
                        network
                    )
                ).rejects.toThrow('Wallet kernel did not return a signature')
                expect(postWithRetry).not.toHaveBeenCalled()
                expect(store.setTransactionStatus).not.toHaveBeenCalled()
            })

            it('throws when a non wallet-kernel transaction has no external transaction id', async () => {
                const store = createStore(signedTransaction)
                const service = createService(
                    store,
                    {
                        [SigningProvider.BITGO]: createDriver({}),
                    },
                    notifier,
                    logger
                )
                const postWithRetry = vi.fn()

                await expect(
                    service.execute(
                        authContext.userId,
                        walletWithProvider(SigningProvider.BITGO),
                        signedTransaction,
                        executeParams,
                        { postWithRetry } as unknown as LedgerClient,
                        authContext,
                        network
                    )
                ).rejects.toThrow('no signature available')
                expect(postWithRetry).not.toHaveBeenCalled()
            })
        })

        describe('execution outcome', () => {
            const participantTransaction: Transaction = {
                ...signedTransaction,
                payload: {
                    commandId: pendingTransaction.commandId,
                    commands: [],
                },
            }

            const cases = [
                {
                    name: 'participant',
                    wallet: walletWithProvider(SigningProvider.PARTICIPANT),
                    transaction: participantTransaction,
                    drivers: () => ({}),
                },
                {
                    name: 'externally signed',
                    wallet: walletWithProvider(SigningProvider.BITGO),
                    transaction: signedWithExternal,
                    drivers: () => ({
                        [SigningProvider.BITGO]: createDriver({
                            getTransaction: vi.fn().mockResolvedValue({
                                status: 'signed',
                                signature: 'sig',
                            }),
                        }),
                    }),
                },
            ]

            const ledgerResult = {
                updateId: 'update-1',
                completionOffset: 42,
            }

            it.each(cases)(
                'persists then emits the executed transaction with its metadata for $name execution',
                async ({ wallet, transaction, drivers }) => {
                    const store = createStore(transaction)
                    const service = createService(
                        store,
                        drivers(),
                        notifier,
                        logger
                    )
                    const postWithRetry = vi
                        .fn()
                        .mockResolvedValue(ledgerResult)
                    const { writeStarted, writeGate } = gateNextStatusWrite(
                        store.setTransactionStatus
                    )

                    const execution = service.execute(
                        authContext.userId,
                        wallet,
                        transaction,
                        executeParams,
                        { postWithRetry } as unknown as LedgerClient,
                        authContext,
                        network
                    )
                    const executionState = trackSettlement(execution)

                    await writeStarted.promise
                    await nextTurn()
                    expect(emit).not.toHaveBeenCalled()
                    expect(executionState.settled).toBe(false)

                    writeGate.resolve()
                    const result = await execution

                    expect(result).toEqual(ledgerResult)
                    expect(store.setTransactionStatus).toHaveBeenCalledTimes(1)
                    expect(store.setTransactionStatus).toHaveBeenCalledWith(
                        transaction.id,
                        'executed',
                        { payload: ledgerResult }
                    )
                    expect(emit).toHaveBeenCalledTimes(1)
                    expect(emit).toHaveBeenCalledWith('txChanged', {
                        id: transaction.id,
                        commandId: transaction.commandId,
                        status: 'executed',
                        preparedTransaction: transaction.preparedTransaction,
                        preparedTransactionHash:
                            transaction.preparedTransactionHash,
                        payload: ledgerResult,
                        origin: transaction.origin,
                        createdAt: transaction.createdAt,
                        signedAt: transaction.signedAt,
                    })
                }
            )

            it.each(cases)(
                'records a ledger rejection as failed before emitting it for $name execution',
                async ({ wallet, transaction, drivers }) => {
                    const store = createStore(transaction)
                    const service = createService(
                        store,
                        drivers(),
                        notifier,
                        logger
                    )
                    const ledgerError = new Error('INVALID_ARGUMENT: rejected')
                    const postWithRetry = vi.fn().mockRejectedValue(ledgerError)
                    const { writeStarted, writeGate } = gateNextStatusWrite(
                        store.setTransactionStatus
                    )

                    const execution = service.execute(
                        authContext.userId,
                        wallet,
                        transaction,
                        executeParams,
                        { postWithRetry } as unknown as LedgerClient,
                        authContext,
                        network
                    )
                    const executionState = trackSettlement(execution)

                    await writeStarted.promise
                    await nextTurn()
                    expect(emit).not.toHaveBeenCalled()
                    expect(executionState.settled).toBe(false)

                    writeGate.resolve()

                    await expect(execution).rejects.toThrow(
                        'Ledger rejected submission INVALID_ARGUMENT: rejected'
                    )
                    await expect(execution).rejects.toHaveProperty(
                        'cause',
                        ledgerError
                    )
                    expect(store.setTransactionStatus).toHaveBeenCalledTimes(1)
                    expect(store.setTransactionStatus).toHaveBeenCalledWith(
                        transaction.id,
                        'failed',
                        { failureReason: 'INVALID_ARGUMENT: rejected' }
                    )
                    expect(emit).toHaveBeenCalledTimes(1)
                    expect(emit).toHaveBeenCalledWith('txChanged', {
                        ...transaction,
                        status: 'failed',
                    })
                    expect(logger.error).toHaveBeenCalledWith(
                        { err: ledgerError, transactionId: transaction.id },
                        'Ledger rejected submission'
                    )
                }
            )

            it.each(cases)(
                'does not report a ledger rejection for $name execution when persisting the executed status fails',
                async ({ wallet, transaction, drivers }) => {
                    const store = createStore(transaction)
                    store.setTransactionStatus.mockRejectedValue(
                        new Error('store unavailable')
                    )
                    const service = createService(
                        store,
                        drivers(),
                        notifier,
                        logger
                    )
                    const postWithRetry = vi
                        .fn()
                        .mockResolvedValue(ledgerResult)

                    await expect(
                        service.execute(
                            authContext.userId,
                            wallet,
                            transaction,
                            executeParams,
                            { postWithRetry } as unknown as LedgerClient,
                            authContext,
                            network
                        )
                    ).rejects.toThrow(/^store unavailable$/)

                    expect(store.setTransactionStatus).toHaveBeenCalledTimes(1)
                    expect(store.setTransactionStatus).toHaveBeenCalledWith(
                        transaction.id,
                        'executed',
                        { payload: ledgerResult }
                    )
                    expect(emit).not.toHaveBeenCalled()
                    expect(logger.error).not.toHaveBeenCalled()
                }
            )

            it.each(cases)(
                'does not report a ledger rejection for $name execution when the executed notification fails',
                async ({ wallet, transaction, drivers }) => {
                    const store = createStore(transaction)
                    emit.mockImplementation(() => {
                        throw new Error('listener failed')
                    })
                    const service = createService(
                        store,
                        drivers(),
                        notifier,
                        logger
                    )
                    const postWithRetry = vi
                        .fn()
                        .mockResolvedValue(ledgerResult)

                    await expect(
                        service.execute(
                            authContext.userId,
                            wallet,
                            transaction,
                            executeParams,
                            { postWithRetry } as unknown as LedgerClient,
                            authContext,
                            network
                        )
                    ).rejects.toThrow(/^listener failed$/)

                    expect(store.setTransactionStatus).toHaveBeenCalledTimes(1)
                    expect(store.setTransactionStatus).toHaveBeenCalledWith(
                        transaction.id,
                        'executed',
                        { payload: ledgerResult }
                    )
                    expect(logger.error).not.toHaveBeenCalled()
                }
            )
        })

        describe('signAndExecute', () => {
            const participantWallet = walletWithProvider(
                SigningProvider.PARTICIPANT
            )

            it('signs and executes when signing completes synchronously', async () => {
                const service = createService(
                    createStore(),
                    {},
                    notifier,
                    logger
                )
                const executeSpy = vi
                    .spyOn(service, 'execute')
                    .mockResolvedValue({ commandId: 'cmd-1' })
                vi.spyOn(service, 'sign').mockResolvedValue({
                    status: 'signed',
                    signature: 'sig',
                    signedBy: 'namespace',
                    partyId: participantWallet.partyId,
                })

                const result = await service.signAndExecute(
                    authContext,
                    network,
                    participantWallet,
                    pendingTransaction
                )

                expect(result).toEqual({ commandId: 'cmd-1' })
                expect(executeSpy).toHaveBeenCalled()
            })

            it('returns pending sign result without executing', async () => {
                const service = createService(
                    createStore(),
                    {},
                    notifier,
                    logger
                )
                const executeSpy = vi.spyOn(service, 'execute')
                vi.spyOn(service, 'sign').mockResolvedValue({
                    status: 'pending',
                    externalTxId: 'ext-1',
                    partyId: participantWallet.partyId,
                })

                const result = await service.signAndExecute(
                    authContext,
                    network,
                    participantWallet,
                    pendingTransaction
                )

                expect(result).toEqual({
                    status: 'pending',
                    externalTxId: 'ext-1',
                    partyId: participantWallet.partyId,
                })
                expect(executeSpy).not.toHaveBeenCalled()
            })

            describe('with a transaction awaiting an external signature', () => {
                const bitgoWallet = walletWithProvider(SigningProvider.BITGO)

                it('stays pending while the provider is still signing', async () => {
                    const getTransaction = vi.fn().mockResolvedValue({
                        status: 'pending',
                        txId: 'external-tx-1',
                    })
                    const store = createStore(awaitingTransaction)
                    const service = createService(
                        store,
                        {
                            [SigningProvider.BITGO]: createDriver({
                                getTransaction,
                            }),
                        },
                        notifier,
                        logger
                    )
                    const signSpy = vi.spyOn(service, 'sign')
                    const executeSpy = vi.spyOn(service, 'execute')

                    const result = await service.signAndExecute(
                        authContext,
                        network,
                        bitgoWallet,
                        awaitingTransaction
                    )

                    expect(result).toEqual({
                        status: 'pending',
                        partyId: wallet.partyId,
                        externalTxId: 'external-tx-1',
                    })
                    expect(signSpy).not.toHaveBeenCalled()
                    expect(executeSpy).not.toHaveBeenCalled()
                })

                it('executes once the provider reports a signature', async () => {
                    const getTransaction = vi.fn().mockResolvedValue({
                        status: 'signed',
                        txId: 'external-tx-1',
                        signature: 'sig',
                    })
                    const store = createStore()
                    store.getTransaction
                        .mockResolvedValueOnce(awaitingTransaction)
                        .mockResolvedValueOnce(awaitingTransaction)
                        .mockResolvedValueOnce(signedWithExternal)
                    const service = createService(
                        store,
                        {
                            [SigningProvider.BITGO]: createDriver({
                                getTransaction,
                            }),
                        },
                        notifier,
                        logger
                    )
                    const executeSpy = vi
                        .spyOn(service, 'execute')
                        .mockResolvedValue({ updateId: 'service-update-1' })
                    const apiKeyContext: AuthContext = {
                        isApiKey: true,
                        userId: 'service-account',
                        ledgerUserId: 'ledger-user',
                        accessToken: 'api-token',
                    }

                    const result = await service.signAndExecute(
                        apiKeyContext,
                        network,
                        bitgoWallet,
                        awaitingTransaction
                    )

                    expect(store.setTransactionSigned).toHaveBeenCalledWith(
                        awaitingTransaction.id,
                        expect.any(Date),
                        'external-tx-1',
                        { expectedStatus: 'awaiting-signature' }
                    )
                    expect(executeSpy).toHaveBeenCalledWith(
                        'ledger-user',
                        bitgoWallet,
                        signedWithExternal,
                        {
                            transactionId: awaitingTransaction.id,
                            partyId: wallet.partyId,
                        },
                        expect.anything(),
                        apiKeyContext,
                        network
                    )
                    expect(result).toEqual({ updateId: 'service-update-1' })
                })

                it('throws when the provider reports a failed signing', async () => {
                    const getTransaction = vi.fn().mockResolvedValue({
                        status: 'rejected',
                        txId: 'external-tx-1',
                    })
                    const store = createStore(awaitingTransaction)
                    const service = createService(
                        store,
                        {
                            [SigningProvider.BITGO]: createDriver({
                                getTransaction,
                            }),
                        },
                        notifier,
                        logger
                    )
                    const executeSpy = vi.spyOn(service, 'execute')

                    await expect(
                        service.signAndExecute(
                            authContext,
                            network,
                            bitgoWallet,
                            awaitingTransaction
                        )
                    ).rejects.toThrow(
                        'Service account signing failed with status: failed and reason: Signing provider returned status: rejected'
                    )
                    expect(executeSpy).not.toHaveBeenCalled()
                })
            })
        })
    })
})
