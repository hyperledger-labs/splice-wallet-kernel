// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Logger } from 'pino'
import { LedgerClient, type Types } from '@canton-network/core-ledger-client'
import type {
    Store,
    Transaction,
    Wallet,
    Network,
} from '@canton-network/core-wallet-store'
import {
    type Error as SigningError,
    type GetTransactionResult,
    SigningProvider,
    type SignTransactionResult,
    type Methods as SigningController,
    type SignTransactionParams,
} from '@canton-network/core-signing-lib'
import type { SigningDrivers, HASHING_SCHEME_VERSION } from './types.js'
import type { Notifier } from './notification/index.js'
import type {
    ExecuteParams,
    ExecuteResult,
    SignParams,
    SignResult,
} from '@canton-network/core-wallet-user-rpc-client'
import type {
    TxChangedExecutedEvent,
    TxChangedFailedEvent,
    TxChangedPendingEvent,
    TxChangedSignedEvent,
    UserId,
} from '@canton-network/core-wallet-dapp-rpc-client'
import {
    ledgerPrepareParams,
    logDynamically,
    type PrepareParams,
} from './utils.js'
import {
    type AuthContext,
    AuthTokenProvider,
} from '@canton-network/core-wallet-auth'

export type SignAndExecuteResult = SignResult | ExecuteResult

function handleSigningError<T extends object>(result: SigningError | T): T {
    if ('error' in result) {
        throw new Error(
            `Error from signing driver: ${result.error_description}`
        )
    }
    return result
}

export class TransactionService {
    constructor(
        private store: Store,
        private logger: Logger,
        private signingDrivers: SigningDrivers = {},
        private notifier: Notifier,
        private hashingSchemeVersion: HASHING_SCHEME_VERSION
    ) {}

    public async sign(
        authContext: AuthContext,
        wallet: Wallet,
        signParams: SignParams
    ): Promise<SignResult> {
        const signingProvider = wallet.signingProviderId as SigningProvider
        const driver = this.signingDrivers[signingProvider]?.controller(
            authContext.userId
        )
        if (!driver) {
            throw new Error(`No driver found for ${signingProvider}`)
        }

        const tx = await this.loadPreparedTransactionForSigning(
            signParams.transactionId
        )

        const baseSignParams = {
            tx: tx.preparedTransaction,
            txHash: tx.preparedTransactionHash,
            keyIdentifier: {
                publicKey: wallet.publicKey,
            },
        }

        const internalTxId = crypto
            .randomUUID()
            .replace(/-/g, '')
            .substring(0, 16)

        /**
         * The ultimate goal is that every signing driver is indistinguishable,
         * and so we can just call the same function for all of them.
         * However, some drivers have different requirements, so we need to handle them separately for now.
         *
         * This is a soft-blocker for 3rd-party driver plugins, since we wouldn't be able to add them to the codebase here
         */
        switch (signingProvider) {
            case SigningProvider.PARTICIPANT:
            case SigningProvider.WALLET_KERNEL:
            case SigningProvider.DFNS:
            case SigningProvider.BITGO: {
                return this.signWithDriver(
                    driver,
                    signingProvider,
                    wallet,
                    tx,
                    baseSignParams
                )
            }
            case SigningProvider.BLOCKDAEMON: {
                if (!authContext.email) {
                    throw new Error(
                        'Email is required for Blockdaemon wallet allocation'
                    )
                }

                const blockdaemonDriver = this.signingDrivers[
                    SigningProvider.BLOCKDAEMON
                ]?.controller(authContext.email)

                return this.signWithDriver(
                    blockdaemonDriver!, // we checked the driver existence above, so this is safe
                    signingProvider,
                    wallet,
                    tx,
                    { ...baseSignParams, internalTxId }
                )
            }
            case SigningProvider.FIREBLOCKS: {
                return this.signWithDriver(
                    driver,
                    signingProvider,
                    wallet,
                    tx,
                    { ...baseSignParams, userId: authContext.userId }
                )
            }
            case SigningProvider.SECUROSYS: {
                const { keyLabelFromPublicKey } =
                    await import('@canton-network/core-signing-securosys')
                return this.signWithDriver(
                    driver,
                    signingProvider,
                    wallet,
                    tx,
                    {
                        ...baseSignParams,
                        keyIdentifier: {
                            id: keyLabelFromPublicKey(wallet.publicKey),
                            publicKey: wallet.publicKey,
                        },
                    }
                )
            }
            default:
                throw new Error(
                    `Unsupported signing provider: ${wallet.signingProviderId}`
                )
        }
    }

    public async execute(
        userId: UserId,
        wallet: Wallet,
        transaction: Transaction,
        executeParams: ExecuteParams,
        ledgerClient: LedgerClient,
        authContext: AuthContext,
        network?: Network
    ): Promise<ExecuteResult> {
        if (transaction.status !== 'signed') {
            throw new Error(
                `Cannot execute a ${transaction.status} transaction. Expected status: signed.`
            )
        }

        if (wallet.signingProviderId === SigningProvider.PARTICIPANT) {
            if (!network) {
                throw new Error('Network is required for participant signing')
            }

            return await this.executeWithParticipant(
                userId,
                executeParams,
                transaction,
                ledgerClient,
                network
            )
        }

        return await this.executeWithExternal(
            userId,
            executeParams,
            wallet,
            transaction,
            ledgerClient,
            authContext
        )
    }

    public async signAndExecute(
        authContext: AuthContext,
        network: Network,
        wallet: Wallet,
        transaction: Transaction
    ): Promise<SignAndExecuteResult> {
        const existing = await this.store.getTransaction(transaction.id)
        const signParams: SignParams = {
            transactionId: transaction.id,
            partyId: wallet.partyId,
        }
        if (!existing) {
            throw new Error(`Transaction not found with id ${transaction.id}`)
        }

        if (existing.status === 'awaiting-signature' && existing.externalTxId) {
            const refreshed = await this.refreshTransaction(
                authContext,
                wallet,
                transaction.id
            )

            if (refreshed.status === 'awaiting-signature') {
                return {
                    status: 'pending',
                    partyId: wallet.partyId,
                    externalTxId: existing.externalTxId,
                }
            }

            if (refreshed.status !== 'signed') {
                throw new Error(
                    `Service account signing failed with status: ${refreshed.status} and reason: ${refreshed.failureReason}`
                )
            }
        } else {
            const signResult = await this.sign(authContext, wallet, signParams)
            if (signResult.status === 'pending') return signResult

            if (signResult.status !== 'signed') {
                throw new Error(
                    `Service account signing failed with status ${signResult.status}`
                )
            }
        }

        const ledgerClient = new LedgerClient({
            baseUrl: new URL(network.ledgerApi.baseUrl),
            logger: this.logger,
            accessTokenProvider: AuthTokenProvider.fromToken(
                authContext.accessToken,
                this.logger
            ),
        })

        const executeParams: ExecuteParams = {
            transactionId: transaction.id,
            partyId: wallet.partyId,
        }

        const userId = authContext.isApiKey
            ? authContext.ledgerUserId
            : authContext.userId

        const signedTx = await this.store.getTransaction(transaction.id)

        if (!signedTx) {
            throw new Error(`Transaction not found with id: ${transaction.id}`)
        }

        return this.execute(
            userId,
            wallet,
            signedTx,
            executeParams,
            ledgerClient,
            authContext,
            network
        )
    }

    public async refreshTransaction(
        authContext: AuthContext,
        wallet: Wallet,
        transactionId: Transaction['id']
    ): Promise<{
        status: Transaction['status']
        externalTxId?: string
        failureReason?: string
    }> {
        const tx = await this.store.getTransaction(transactionId)
        if (!tx) {
            throw new Error(`Transaction not found with id: ${transactionId}`)
        }

        if (!tx.externalTxId || tx.status !== 'awaiting-signature') {
            return {
                status: tx.status,
                ...(tx.externalTxId && { externalTxId: tx.externalTxId }),
                ...(tx.failureReason && {
                    failureReason: tx.failureReason,
                }),
            }
        }

        const signingResult = await this.getSigningResult(
            authContext,
            wallet,
            tx.externalTxId
        )

        logDynamically(this.logger, `Refreshed signing status`, {
            info: { transactionId: tx.id, status: signingResult.status },
            debug: { signingResult, tx },
        })

        return this.applySigningResult(tx, signingResult, wallet)
    }

    private async getSigningResult(
        authContext: AuthContext,
        wallet: Wallet,
        externalTxId: string
    ): Promise<Exclude<GetTransactionResult, SigningError>> {
        const provider = wallet.signingProviderId as SigningProvider
        const signingProvider = this.signingDrivers[provider]
        if (!signingProvider) {
            throw new Error(`No driver found for provider ${provider}`)
        }

        if (provider === SigningProvider.BLOCKDAEMON && !authContext.email) {
            throw new Error(
                'Invalid auth context (missing email) for SigningProvider BlockDaemon'
            )
        }

        const controllerId =
            provider === SigningProvider.BLOCKDAEMON
                ? authContext.email
                : authContext.userId

        const driver = signingProvider.controller(controllerId)
        const args =
            provider === SigningProvider.SECUROSYS
                ? { txId: externalTxId }
                : { userId: controllerId, txId: externalTxId }

        return driver.getTransaction(args).then(handleSigningError)
    }

    private async applySigningResult(
        tx: Transaction,
        signingResult: Exclude<
            GetTransactionResult | SignTransactionResult,
            SigningError
        >,
        wallet: Wallet
    ): Promise<{
        status: Transaction['status']
        externalTxId?: string
        failureReason?: string
    }> {
        const now = new Date()
        if (signingResult.status === 'signed') {
            if (!signingResult.signature) {
                throw new Error('No signature returned from signing driver')
            }

            const applied = await this.store.setTransactionSigned(
                tx.id,
                now,
                signingResult.txId,
                { expectedStatus: tx.status }
            )

            if (!applied) {
                const current = await this.store.getTransaction(tx.id)
                return { status: current!.status }
            }

            this.notifier.emit('txChanged', {
                ...tx,
                ...{
                    signedAt: now,
                    externalTxId: signingResult.txId,
                },
                status: 'signed',
                payload: {
                    signature: signingResult.signature,
                    signedBy: wallet.namespace,
                    party: wallet.partyId,
                },
            } satisfies TxChangedSignedEvent)

            return { status: 'signed', externalTxId: signingResult.txId }
        }

        const status =
            signingResult.status === 'pending' ? 'awaiting-signature' : 'failed'
        const failureReason =
            status === 'failed'
                ? `Signing provider returned status: ${signingResult.status}`
                : undefined

        await this.store.setTransactionStatus(
            tx.id,
            status,
            {
                externalTxId: signingResult.txId,
                ...(failureReason && { failureReason }),
            },
            { expectedStatus: tx.status }
        )

        // dApp reports pending for anything not yet signed
        // awaiting-signature can be a gateway UI internal distinction for polling
        this.notifier.emit(
            'txChanged',
            status === 'awaiting-signature'
                ? ({
                      ...tx,
                      ...{
                          externalTxId: signingResult.txId,
                      },
                      status: 'pending',
                  } satisfies TxChangedPendingEvent)
                : ({
                      ...tx,
                      ...{
                          externalTxId: signingResult.txId,
                      },
                      status: status,
                  } satisfies TxChangedFailedEvent)
        )

        return {
            status,
            externalTxId: signingResult.txId,
            ...(failureReason && { failureReason }),
        }
    }

    private async loadPreparedTransactionForSigning(
        transactionId: Transaction['id']
    ): Promise<Transaction> {
        const existingTx = await this.store.getTransaction(transactionId)

        if (!existingTx) {
            throw new Error(`Transaction not found with id: ${transactionId}`)
        }

        if (existingTx.status !== 'pending' || existingTx.externalTxId) {
            throw new Error(
                `Cannot sign an already ${existingTx.status} transaction`
            )
        }

        return existingTx
    }

    private async signWithDriver(
        driver: SigningController,
        driverId: SigningProvider,
        wallet: Wallet,
        tx: Transaction,
        signTransactionParams: SignTransactionParams
    ): Promise<SignResult> {
        const signingResult: Exclude<
            GetTransactionResult | SignTransactionResult,
            SigningError
        > = await driver
            .signTransaction(signTransactionParams)
            .then(handleSigningError)

        logDynamically(this.logger, 'Driver signing result', {
            info: {
                transactionId: tx.id,
                status: signingResult.status,
                driverId,
            },
            debug: { signingResult, tx },
        })

        const applied = await this.applySigningResult(tx, signingResult, wallet)

        if (applied.status !== 'signed' && signingResult.status === 'signed') {
            throw new Error(
                `Transansaction ${tx.id} changed to ${applied.status} while signing`
            )
        }

        if (signingResult.status === 'signed') {
            if (!signingResult.signature) {
                throw new Error('No signature returned from signing driver')
            }

            return {
                status: signingResult.status,
                signature: signingResult.signature,
                signedBy: wallet.namespace,
                partyId: wallet.partyId,
                externalTxId: signingResult.txId,
            }
        }

        return {
            status: signingResult.status,
            externalTxId: signingResult.txId,
            partyId: wallet.partyId,
        }
    }

    private async executeWithParticipant(
        userId: UserId,
        executeParams: ExecuteParams,
        transaction: Transaction,
        ledgerClient: LedgerClient,
        network: Network
    ): Promise<ExecuteResult> {
        const { partyId } = executeParams
        const { commandId } = transaction

        const synchronizerId =
            network.synchronizerId ?? (await ledgerClient.getSynchronizerId())

        const prep = ledgerPrepareParams({
            userId,
            partyIds: [partyId],
            synchronizerId,
            params: transaction.payload as PrepareParams,
            hashingSchemeVersion: this.hashingSchemeVersion,
        })

        try {
            const result = await ledgerClient.postWithRetry(
                '/v2/commands/submit-and-wait',
                prep
            )
            logDynamically(this.logger, 'Participant execution result', {
                info: { transactionId: transaction.id },
                debug: { result, transaction, executeParams, userId },
            })

            const executedTx = {
                id: transaction.id,
                commandId,
                status: 'executed',
                preparedTransaction: transaction.preparedTransaction,
                preparedTransactionHash: transaction.preparedTransactionHash,
                payload: result,
                origin: transaction.origin ?? null,
                ...(transaction.createdAt && {
                    createdAt: transaction.createdAt,
                }),
                ...(transaction.signedAt && {
                    signedAt: transaction.signedAt,
                }),
            } satisfies Transaction
            await this.store.setTransactionStatus(transaction.id, 'executed', {
                payload: result,
            })
            this.notifier.emit(
                'txChanged',
                executedTx satisfies TxChangedExecutedEvent
            )

            return result
        } catch (err) {
            const failureReason = this.extractLedgerError(err)

            this.logger.error(
                { err, transactionId: transaction.id },
                'Ledger rejected submission'
            )

            await this.store.setTransactionStatus(transaction.id, 'failed', {
                failureReason,
            })
            this.notifier.emit('txChanged', {
                ...transaction,
                status: 'failed',
            } satisfies TxChangedFailedEvent)

            throw new Error(`Ledger rejected submission ${failureReason}`, {
                cause: err,
            })
        }
    }

    private async executeWithExternal(
        userId: UserId,
        executeParams: ExecuteParams,
        wallet: Wallet,
        transaction: Transaction,
        ledgerClient: LedgerClient,
        authContext: AuthContext
    ): Promise<ExecuteResult> {
        const { partyId } = executeParams
        const { commandId } = transaction
        let rawSignature: string

        if (transaction.externalTxId) {
            const signingResult = await this.getSigningResult(
                authContext,
                wallet,
                transaction.externalTxId
            )

            if (signingResult.status !== 'signed' || !signingResult.signature) {
                throw new Error(
                    `Status either not signed or no signature available`
                )
            }

            rawSignature = signingResult.signature
        } else if (wallet.signingProviderId === SigningProvider.WALLET_KERNEL) {
            const driver =
                this.signingDrivers[SigningProvider.WALLET_KERNEL]?.controller(
                    userId
                )

            if (!driver) {
                throw new Error(`Wallet kernel signing driver not available`)
            }

            const { signature } = await driver
                .signTransaction({
                    tx: transaction.preparedTransaction,
                    txHash: transaction.preparedTransactionHash,
                    keyIdentifier: { publicKey: wallet.publicKey },
                })
                .then(handleSigningError)

            if (!signature) {
                throw new Error(`Wallet kernel did not return a signature`)
            }

            rawSignature = signature
        } else {
            throw new Error('no signature available')
        }

        const signature = rawSignature

        const signedBy = wallet.namespace

        try {
            const result = await ledgerClient.postWithRetry(
                '/v2/interactive-submission/executeAndWait',
                {
                    userId,
                    preparedTransaction: transaction.preparedTransaction,
                    hashingSchemeVersion: this.hashingSchemeVersion,
                    submissionId: commandId,
                    deduplicationPeriod: {
                        Empty: {},
                    },
                    partySignatures: {
                        signatures: [
                            {
                                party: partyId,
                                signatures: [
                                    {
                                        signature,
                                        signedBy,
                                        format: 'SIGNATURE_FORMAT_CONCAT',
                                        signingAlgorithmSpec:
                                            'SIGNING_ALGORITHM_SPEC_ED25519',
                                    },
                                ],
                            },
                        ],
                    },
                } as Types['JsExecuteSubmissionAndWaitRequest'],
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

            logDynamically(this.logger, 'Externally signed execution result', {
                info: { transactionId: transaction.id },
                debug: { result, transaction, executeParams, userId },
            })

            const executedTx = {
                id: transaction.id,
                commandId,
                status: 'executed',
                preparedTransaction: transaction.preparedTransaction,
                preparedTransactionHash: transaction.preparedTransactionHash,
                payload: result,
                origin: transaction.origin ?? null,
                ...(transaction.createdAt && {
                    createdAt: transaction.createdAt,
                }),
                ...(transaction.signedAt && {
                    signedAt: transaction.signedAt,
                }),
            } satisfies Transaction
            await this.store.setTransactionStatus(transaction.id, 'executed', {
                payload: result,
            })
            this.notifier.emit(
                'txChanged',
                executedTx satisfies TxChangedExecutedEvent
            )

            return result
        } catch (err) {
            const failureReason = this.extractLedgerError(err)
            this.logger.error(
                { err: err, transactionId: transaction.id },
                `Ledger rejected the submission`
            )

            await this.store.setTransactionStatus(transaction.id, 'failed', {
                failureReason: failureReason,
            })

            this.notifier.emit(`txChanged`, {
                ...transaction,
                status: 'failed',
            } satisfies TxChangedFailedEvent)

            throw new Error(`Ledger rejected submission ${failureReason}`, {
                cause: err,
            })
        }
    }

    private extractLedgerError(error: unknown): string {
        if (error instanceof Error) {
            return error.message
        }

        if (typeof error === 'object' && error !== null) {
            return JSON.stringify(error)
        }

        return String(error)
    }
}
