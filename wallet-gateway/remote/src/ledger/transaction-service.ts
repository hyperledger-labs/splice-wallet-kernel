// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Logger } from 'pino'
import { Store, Transaction, Wallet } from '@canton-network/core-wallet-store'
import type { SignResult } from '../user-api/rpc-gen/typings.js'
import {
    Error as SigningError,
    SigningDriverInterface,
    SigningProvider,
} from '@canton-network/core-signing-lib'
import { SignParams } from '../user-api/rpc-gen/typings.js'
import { UserId } from '../dapp-api/rpc-gen/typings.js'

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
        private signingDrivers: Partial<
            Record<SigningProvider, SigningDriverInterface>
        > = {}
    ) {}

    public signWithParticipant(wallet: Wallet): SignResult {
        return {
            signature: 'none',
            signedBy: wallet.namespace,
            partyId: wallet.partyId,
        }
    }

    public async signWithWalletKernel(
        userId: UserId,
        wallet: Wallet,
        signParams: SignParams
    ): Promise<SignResult> {
        const signingProvider =
            this.signingDrivers[SigningProvider.WALLET_KERNEL]
        if (!signingProvider) {
            throw new Error('Wallet Kernel signing driver not available')
        }
        const driver = signingProvider.controller(userId)

        const { preparedTransaction, preparedTransactionHash, commandId } =
            signParams
        const { signature } = await driver
            .signTransaction({
                tx: preparedTransaction,
                txHash: preparedTransactionHash,
                keyIdentifier: {
                    publicKey: wallet.publicKey,
                },
            })
            .then(handleSigningError)

        if (!signature) {
            throw new Error(
                'Failed to sign transaction: ' + JSON.stringify(signature)
            )
        }

        const existingTx = await this.store.getTransaction(commandId)
        const now = new Date()

        const signedTx: Transaction = {
            commandId,
            status: 'signed',
            preparedTransaction,
            preparedTransactionHash,
            origin: existingTx?.origin ?? null,
            ...(existingTx?.createdAt && {
                createdAt: existingTx.createdAt,
            }),
            signedAt: now,
        }

        this.store.setTransaction(signedTx)
        // notifier.emit('txChanged', signedTx)

        return {
            signature,
            signedBy: wallet.namespace,
            partyId: wallet.partyId,
        }
    }

    public async signWithBlockdaemon() {
        // TODO
    }
}
