// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LedgerClient } from '@canton-network/core-ledger-client'
import { InternalSigningDriver } from '@canton-network/core-signing-internal'
import {
    createKeyPair,
    SigningProvider,
    verifySignedTxHash,
    type SigningDriverInterface,
} from '@canton-network/core-signing-lib'
import { WxtStore } from '@canton-network/core-signing-store-wxt'
import {
    NotificationService,
    subscribeNotifications,
} from '@canton-network/core-wallet-services/notification'
import {
    PartyLevelRight,
    type Store,
    type Transaction,
    type Wallet,
} from '@canton-network/core-wallet-store'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { AuthService } from '../auth-service'
import { initializeWalletStore } from '../store'
import { userController } from './controller'

const networkId = 'canton:local-oauth'
const authContext = { userId: 'user-1', accessToken: 'token-1' }

describe('userController.addSession', () => {
    let service: NotificationService
    let controller: ReturnType<typeof userController>

    const fakeSink = () => ({ send: vi.fn(), close: vi.fn() })
    const subscribe = (sessionId: string) => {
        const sink = fakeSink()
        subscribeNotifications(
            service,
            { sessionId, userId: authContext.userId },
            sink
        )
        return sink
    }

    beforeEach(async () => {
        vi.spyOn(AuthService, 'loadAuthContext').mockResolvedValue(authContext)
        service = new NotificationService({ debug: vi.fn(), error: vi.fn() })
        const store = await initializeWalletStore()
        controller = userController(
            async () => store,
            {} as SigningDriverInterface,
            service
        )
    })

    it('closes the notification subscriptions of a replaced session', async () => {
        const first = await controller.addSession({
            origin: 'https://dapp.example',
            networkId,
        })
        const other = await controller.addSession({
            origin: 'https://other.example',
            networkId,
        })
        const firstSink = subscribe(first.id)
        const otherSink = subscribe(other.id)

        const second = await controller.addSession({
            origin: 'https://dapp.example',
            networkId,
        })

        expect(firstSink.close).toHaveBeenCalledTimes(1)
        expect(service.getNotifier(first.id).emit('txChanged', {})).toBe(false)
        expect(otherSink.close).not.toHaveBeenCalled()

        const secondSink = subscribe(second.id)
        service.getNotifier(second.id).emit('txChanged', { status: 'pending' })
        expect(secondSink.send).toHaveBeenCalledWith('txChanged', [
            { status: 'pending' },
        ])
        expect(firstSink.send).not.toHaveBeenCalled()
    })
})

describe('userController transactions', () => {
    const otherAuthContext = { ...authContext, accessToken: 'token-2' }
    const keyPair = createKeyPair()
    // Base64 of a 32-byte hash, as signed by the wallet-kernel driver
    const preparedTransactionHash = btoa('h'.repeat(32))
    const ledgerResult = { updateId: 'update-1', completionOffset: 42 }

    const wallet: Wallet = {
        primary: true,
        status: 'allocated',
        partyId: 'party::namespace',
        hint: 'party',
        namespace: 'namespace',
        signingProviderId: SigningProvider.WALLET_KERNEL,
        publicKey: keyPair.publicKey,
        networkId,
        rights: [PartyLevelRight.CanActAs],
        userId: authContext.userId,
    }
    const pendingTransaction: Transaction = {
        id: 'tx-1',
        commandId: 'cmd-1',
        status: 'pending',
        preparedTransaction: 'prepared-tx',
        preparedTransactionHash,
        origin: 'https://dapp.example',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }
    const params = {
        transactionId: pendingTransaction.id,
        partyId: wallet.partyId,
    }

    let service: NotificationService
    let store: Store
    let signingStore: WxtStore
    let controller: ReturnType<typeof userController>
    let postWithRetry: ReturnType<typeof vi.spyOn>
    let sessionSink: { send: ReturnType<typeof vi.fn>; close: () => void }
    let otherSessionSink: { send: ReturnType<typeof vi.fn>; close: () => void }

    const subscribe = (sessionId: string) => {
        const sink = { send: vi.fn(), close: vi.fn() }
        subscribeNotifications(
            service,
            { sessionId, userId: authContext.userId },
            sink
        )
        return sink
    }
    const txChangedEvents = (sink: { send: ReturnType<typeof vi.fn> }) =>
        sink.send.mock.calls
            .filter(([event]) => event === 'txChanged')
            .map(([, args]) => (args as unknown[])[0])

    beforeEach(async () => {
        fakeBrowser.reset()
        const loadAuthContext = vi
            .spyOn(AuthService, 'loadAuthContext')
            .mockResolvedValue(authContext)
        postWithRetry = vi
            .spyOn(LedgerClient.prototype, 'postWithRetry')
            .mockResolvedValue(ledgerResult)

        service = new NotificationService({ debug: vi.fn(), error: vi.fn() })
        store = await initializeWalletStore()
        signingStore = new WxtStore(authContext.userId)
        await signingStore.setSigningKey(authContext.userId, {
            id: 'key-1',
            name: wallet.hint,
            ...keyPair,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        controller = userController(
            async () => store,
            new InternalSigningDriver(signingStore),
            service
        )

        const session = await controller.addSession({
            origin: pendingTransaction.origin!,
            networkId,
        })
        loadAuthContext.mockResolvedValueOnce(otherAuthContext)
        const otherSession = await controller.addSession({
            origin: 'https://other.example',
            networkId,
        })
        sessionSink = subscribe(session.id)
        otherSessionSink = subscribe(otherSession.id)

        await store.addWallet({ ...wallet })
        await store.setTransaction({ ...pendingTransaction })
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('executes with the signature stored under the signing transaction ID', async () => {
        const getSigningTransaction = vi.spyOn(
            signingStore,
            'getSigningTransaction'
        )

        const signResult = await controller.sign(params)

        expect(signResult).toEqual({
            status: 'signed',
            signature: expect.any(String),
            signedBy: wallet.namespace,
            partyId: wallet.partyId,
            externalTxId: expect.any(String),
        })
        if (signResult.status !== 'signed') throw new Error('not signed')
        const { signature, externalTxId } = signResult
        expect(
            verifySignedTxHash(
                preparedTransactionHash,
                keyPair.publicKey,
                signature
            )
        ).toBe(true)
        const signedTx = await store.getTransaction(pendingTransaction.id)
        expect(signedTx).toMatchObject({ status: 'signed', externalTxId })

        const result = await controller.execute(params)

        expect(result).toEqual(ledgerResult)
        expect(getSigningTransaction).toHaveBeenCalledWith(
            authContext.userId,
            externalTxId
        )
        expect(postWithRetry).toHaveBeenCalledWith(
            '/v2/interactive-submission/executeAndWait',
            {
                userId: authContext.userId,
                preparedTransaction: pendingTransaction.preparedTransaction,
                hashingSchemeVersion: 'HASHING_SCHEME_VERSION_V3',
                submissionId: pendingTransaction.commandId,
                deduplicationPeriod: { Empty: {} },
                partySignatures: {
                    signatures: [
                        {
                            party: wallet.partyId,
                            signatures: [
                                {
                                    signature,
                                    signedBy: wallet.namespace,
                                    format: 'SIGNATURE_FORMAT_CONCAT',
                                    signingAlgorithmSpec:
                                        'SIGNING_ALGORITHM_SPEC_ED25519',
                                },
                            ],
                        },
                    ],
                },
            },
            expect.objectContaining({
                retries: 20,
                delayMs: 3000,
                cantonErrorKeys: expect.arrayContaining([
                    'SEQUENCER_BACKPRESSURE',
                    'SUBMISSION_ALREADY_IN_FLIGHT',
                ]),
            })
        )
        expect(await store.getTransaction(pendingTransaction.id)).toMatchObject(
            { status: 'executed', payload: ledgerResult, externalTxId }
        )

        expect(txChangedEvents(sessionSink)).toEqual([
            expect.objectContaining({
                id: pendingTransaction.id,
                commandId: pendingTransaction.commandId,
                origin: pendingTransaction.origin,
                createdAt: pendingTransaction.createdAt,
                status: 'signed',
                signedAt: expect.any(Date),
                externalTxId,
                payload: {
                    signature,
                    signedBy: wallet.namespace,
                    party: wallet.partyId,
                },
            }),
            expect.objectContaining({
                id: pendingTransaction.id,
                commandId: pendingTransaction.commandId,
                origin: pendingTransaction.origin,
                createdAt: pendingTransaction.createdAt,
                signedAt: signedTx!.signedAt,
                status: 'executed',
                payload: ledgerResult,
            }),
        ])
        expect(otherSessionSink.send).not.toHaveBeenCalled()
    })

    it('executes transactions signed concurrently', async () => {
        const secondTransaction: Transaction = {
            ...pendingTransaction,
            id: 'tx-2',
            commandId: 'cmd-2',
            preparedTransaction: 'prepared-tx-2',
            preparedTransactionHash: btoa('i'.repeat(32)),
        }
        await store.setTransaction({ ...secondTransaction })
        const secondParams = { ...params, transactionId: secondTransaction.id }

        const signResults = await Promise.all([
            controller.sign(params),
            controller.sign(secondParams),
        ])

        const externalTxIds = signResults.map((result) =>
            result.status === 'signed' ? result.externalTxId : undefined
        )
        expect(new Set(externalTxIds).size).toBe(2)
        for (const externalTxId of externalTxIds) {
            expect(
                await signingStore.getSigningTransaction(
                    authContext.userId,
                    externalTxId!
                )
            ).toMatchObject({ id: externalTxId, status: 'signed' })
        }

        await expect(controller.execute(params)).resolves.toEqual(ledgerResult)
        await expect(controller.execute(secondParams)).resolves.toEqual(
            ledgerResult
        )

        const requests = postWithRetry.mock.calls as [
            string,
            {
                submissionId: string
                partySignatures: {
                    signatures: [{ signatures: [{ signature: string }] }]
                }
            },
        ][]
        expect(
            requests.map(([, request]) => ({
                submissionId: request.submissionId,
                signature:
                    request.partySignatures.signatures[0].signatures[0]
                        .signature,
            }))
        ).toEqual(
            signResults.map((result, index) => ({
                submissionId: [pendingTransaction, secondTransaction][index]!
                    .commandId,
                signature:
                    result.status === 'signed' ? result.signature : undefined,
            }))
        )
        for (const transaction of [pendingTransaction, secondTransaction]) {
            expect(await store.getTransaction(transaction.id)).toMatchObject({
                status: 'executed',
                payload: ledgerResult,
            })
        }
        const events = txChangedEvents(sessionSink).map((event) => {
            const { id, status } = event as Transaction
            return `${id}:${status}`
        })
        expect(events.slice(0, 2).sort()).toEqual([
            'tx-1:signed',
            'tx-2:signed',
        ])
        expect(events.slice(2)).toEqual(['tx-1:executed', 'tx-2:executed'])
        expect(otherSessionSink.send).not.toHaveBeenCalled()
    })

    it('re-signs a legacy signed transaction without a signing transaction ID', async () => {
        await store.setTransactionSigned(pendingTransaction.id, new Date())

        await controller.execute(params)

        const request = postWithRetry.mock.calls[0]![1] as {
            partySignatures: {
                signatures: [{ signatures: [{ signature: string }] }]
            }
        }
        const [{ signature }] = request.partySignatures.signatures[0].signatures
        expect(
            verifySignedTxHash(
                preparedTransactionHash,
                keyPair.publicKey,
                signature
            )
        ).toBe(true)
        expect(txChangedEvents(sessionSink)).toEqual([
            expect.objectContaining({
                id: pendingTransaction.id,
                origin: pendingTransaction.origin,
                status: 'executed',
            }),
        ])
        expect(otherSessionSink.send).not.toHaveBeenCalled()
    })

    it('does not mark a transaction signed after it changed while signing', async () => {
        const setSigningTransaction =
            signingStore.setSigningTransaction.bind(signingStore)
        vi.spyOn(signingStore, 'setSigningTransaction').mockImplementation(
            async (...args) => {
                await store.setTransactionStatus(
                    pendingTransaction.id,
                    'failed'
                )
                return setSigningTransaction(...args)
            }
        )

        await expect(controller.sign(params)).rejects.toThrow(
            'changed to failed while signing'
        )

        expect(await store.getTransaction(pendingTransaction.id)).toMatchObject(
            { status: 'failed' }
        )
        expect(sessionSink.send).not.toHaveBeenCalled()
        expect(otherSessionSink.send).not.toHaveBeenCalled()
    })

    it('records a ledger rejection as a failed transaction', async () => {
        postWithRetry.mockRejectedValue(new Error('INVALID_ARGUMENT'))
        await controller.sign(params)

        await expect(controller.execute(params)).rejects.toThrow(
            'Ledger rejected submission INVALID_ARGUMENT'
        )

        expect(await store.getTransaction(pendingTransaction.id)).toMatchObject(
            { status: 'failed', failureReason: 'INVALID_ARGUMENT' }
        )
        expect(txChangedEvents(sessionSink)).toEqual([
            expect.objectContaining({ status: 'signed' }),
            expect.objectContaining({
                id: pendingTransaction.id,
                commandId: pendingTransaction.commandId,
                origin: pendingTransaction.origin,
                status: 'failed',
            }),
        ])
        expect(otherSessionSink.send).not.toHaveBeenCalled()
    })

    it('only signs with the wallet-kernel driver', async () => {
        await store.updateWallet({
            partyId: wallet.partyId,
            networkId,
            signingProviderId: SigningProvider.PARTICIPANT,
        })

        await expect(controller.sign(params)).rejects.toThrow(
            `No driver found for ${SigningProvider.PARTICIPANT}`
        )
        expect(sessionSink.send).not.toHaveBeenCalled()
    })
})
