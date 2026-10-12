// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { LedgerClient, Types } from '@canton-network/core-ledger-client'
import {
    isRpcError,
    SigningProvider,
    type SigningDriverInterface,
} from '@canton-network/core-signing-lib'
import type { AuthContext } from '@canton-network/core-wallet-auth'
import type { Notifier } from '@canton-network/core-wallet-services/notification'
import type {
    Store,
    Transaction,
    Wallet,
} from '@canton-network/core-wallet-store'
import type { Logger } from 'pino'
import type { TxChangedEvent } from '../dapp/rpc-gen/typings.js'
import type {
    ExecuteParams,
    ExecuteResult,
    SignParams,
    SignResultSigned,
} from './rpc-gen/typings.js'

export class TransactionService {
    constructor(
        private store: Store,
        private logger: Logger,
        private signingDriver: SigningDriverInterface,
        /** Notifier of the session the transactions belong to. */
        private notifier: Notifier
    ) {}

    public async sign(
        authContext: AuthContext,
        wallet: Wallet,
        signParams: SignParams
    ): Promise<SignResultSigned> {
        if (
            wallet.signingProviderId !== SigningProvider.WALLET_KERNEL ||
            this.signingDriver.signingProvider !== SigningProvider.WALLET_KERNEL
        ) {
            throw new Error(
                `Unsupported signing provider: ${wallet.signingProviderId}`
            )
        }

        return this.signWithWalletKernel(authContext.userId, wallet, signParams)
    }

    public async execute(
        userId: string,
        wallet: Wallet,
        transaction: Transaction,
        executeParams: ExecuteParams,
        ledgerClient: LedgerClient
    ): Promise<ExecuteResult> {
        if (transaction.status !== 'signed') {
            throw new Error(
                `Cannot execute a ${transaction.status} transaction. Expected status: signed.`
            )
        }

        if (wallet.signingProviderId !== SigningProvider.WALLET_KERNEL) {
            throw new Error(
                `Unsupported signing provider: ${wallet.signingProviderId}`
            )
        }

        return this.executeWithExternal(
            userId,
            executeParams,
            transaction,
            ledgerClient
        )
    }

    private async loadPreparedTransactionForSigning(
        transactionId: Transaction['id']
    ): Promise<Transaction> {
        const existingTx = await this.store.getTransaction(transactionId)

        if (!existingTx) {
            throw new Error(`Transaction not found with id: ${transactionId}`)
        }

        if (existingTx.status !== 'pending') {
            throw new Error(
                `Cannot sign an already ${existingTx.status} transaction`
            )
        }

        return existingTx
    }

    private async signWithWalletKernel(
        userId: string,
        wallet: Wallet,
        signParams: SignParams
    ): Promise<SignResultSigned> {
        const driver = this.signingDriver.controller(userId)
        const tx = await this.loadPreparedTransactionForSigning(
            signParams.transactionId
        )
        const signingResult = await driver.signTransaction({
            tx: tx.preparedTransaction,
            txHash: tx.preparedTransactionHash,
            keyIdentifier: {
                publicKey: wallet.publicKey,
            },
        })

        if (isRpcError(signingResult)) {
            throw new Error(
                `Error from signing driver: ${signingResult.error_description}`
            )
        }

        if (!signingResult.signature) {
            throw new Error(
                `Failed to sign transaction: ${JSON.stringify(signingResult.signature)}`
            )
        }

        const now = new Date()
        await this.store.setTransactionSigned(tx.id, now)
        this.emitTxChanged({
            status: 'signed',
            commandId: tx.commandId,
            payload: {
                signature: signingResult.signature,
                signedBy: wallet.namespace,
                party: wallet.partyId,
            },
        })

        this.logger.info(
            { transactionId: tx.id },
            'Transaction signed with wallet kernel'
        )

        return {
            status: 'signed',
            signature: signingResult.signature,
            signedBy: wallet.namespace,
            partyId: wallet.partyId,
        }
    }

    private async executeWithExternal(
        userId: string,
        executeParams: ExecuteParams,
        transaction: Transaction,
        ledgerClient: LedgerClient
    ): Promise<ExecuteResult> {
        const { partyId, signature, signedBy } = executeParams
        const { commandId } = transaction

        const request: Types['JsExecuteSubmissionAndWaitRequest'] = {
            userId,
            preparedTransaction: transaction.preparedTransaction,
            hashingSchemeVersion: 'HASHING_SCHEME_VERSION_V3',
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
        }

        let result
        try {
            result = await ledgerClient.postWithRetry(
                '/v2/interactive-submission/executeAndWait',
                request
            )
        } catch (err) {
            this.logger.error(
                { err, transactionId: transaction.id },
                'Ledger rejected submission'
            )
            await this.store.setTransactionStatus(transaction.id, 'failed', {
                failureReason: err instanceof Error ? err.message : String(err),
            })
            this.emitTxChanged({
                status: 'failed',
                commandId: transaction.commandId,
            })
            throw err
        }

        this.logger.info(
            { transactionId: transaction.id },
            'Externally signed transaction executed'
        )

        await this.store.setTransactionStatus(transaction.id, 'executed', {
            payload: result,
        })
        this.emitTxChanged({
            status: 'executed',
            commandId: transaction.commandId,
            payload: {
                updateId: result.updateId,
                completionOffset: result.completionOffset,
            },
        })

        return result
    }

    private emitTxChanged(event: TxChangedEvent): void {
        this.notifier.emit('txChanged', event)
    }
}
