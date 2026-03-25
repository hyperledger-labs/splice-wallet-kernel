// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { UserId } from '@canton-network/core-wallet-auth'
import { Store, UpdateWallet, Wallet } from '@canton-network/core-wallet-store'
import {
    Error as SigningError,
    SigningDriverInterface,
    SigningProvider,
} from '@canton-network/core-signing-lib'
import { Logger } from 'pino'
import { PartyAllocationService } from '../../party-allocation-service.js'
import { PartyHint, Primary } from '../../../user-api/rpc-gen/typings.js'
import type { WalletAllocator } from '../wallet-allocation-service.js'
import { WALLET_DISABLED_REASON } from '@canton-network/core-types'

function handleSigningError<T extends object>(result: SigningError | T): T {
    if ('error' in result) {
        throw new Error(
            `Error from signing driver: ${result.error_description}`
        )
    }
    return result
}

export class FireblocksWalletAllocator implements WalletAllocator {
    constructor(
        private store: Store,
        private logger: Logger,
        private partyAllocator: PartyAllocationService,
        private signingDriver: SigningDriverInterface
    ) {}

    async createWallet(
        userId: UserId,
        partyHint: PartyHint,
        primary: Primary = false
    ): Promise<Wallet> {
        const driver = this.signingDriver.controller(userId)

        const keys = await driver.getKeys().then(handleSigningError)
        const key = keys?.keys?.find((k) => k.name === 'Canton Party')
        if (!key) throw new Error('Fireblocks key not found')
        const formattedPublicKey = Buffer.from(key.publicKey, 'hex').toString(
            'base64'
        )

        const namespace =
            this.partyAllocator.createFingerprintFromKey(formattedPublicKey)
        const transactions =
            await this.partyAllocator.generateTopologyTransactions(
                partyHint,
                formattedPublicKey
            )
        const topologyTransactions = transactions.topologyTransactions ?? []

        const { status, txId } = await driver
            .signTransaction({
                tx: '',
                txHash: Buffer.from(transactions.multiHash, 'base64').toString(
                    'hex'
                ),
                keyIdentifier: {
                    publicKey: key.publicKey,
                },
            })
            .then(handleSigningError)

        const network = await this.store.getCurrentNetwork()
        const walletBase: Omit<Wallet, 'status'> = {
            partyId: `${partyHint}::${namespace}`,
            hint: partyHint,
            namespace,
            signingProviderId: SigningProvider.FIREBLOCKS,
            networkId: network.id,
            primary,
            publicKey: key.publicKey,
            externalTxId: txId,
            topologyTransactions: topologyTransactions.join(', '),
            rights: [],
        }
        let wallet: Wallet

        if (status === 'signed') {
            const { signature } = await driver
                .getTransaction({
                    userId,
                    txId,
                })
                .then(handleSigningError)
            if (!signature) {
                throw new Error(
                    'Transaction signed but no signature found in result'
                )
            }
            const partyId =
                await this.partyAllocator.allocatePartyWithExistingWallet(
                    namespace,
                    topologyTransactions,
                    Buffer.from(signature, 'hex').toString('base64'),
                    userId
                )
            wallet = {
                ...walletBase,
                partyId,
                status: 'allocated',
            }
        } else if (status === 'pending') {
            wallet = {
                ...walletBase,
                status: 'initialized',
                reason: WALLET_DISABLED_REASON.TOPOLOGY_TRANSACTION_PENDING,
            }
        } else {
            const reason =
                status === 'rejected'
                    ? WALLET_DISABLED_REASON.TOPOLOGY_TRANSACTION_REJECTED
                    : WALLET_DISABLED_REASON.TOPOLOGY_TRANSACTION_FAILED
            wallet = {
                ...walletBase,
                status: 'removed',
                disabled: true,
                reason,
            }
        }

        await this.store.addWallet(wallet)
        return wallet
    }

    async allocateParty(userId: UserId, existingWallet: Wallet): Promise<void> {
        if (
            !existingWallet.externalTxId ||
            !existingWallet.topologyTransactions
        ) {
            throw new Error(
                'Existing wallet is missing field externalTxId or topologyTransactions'
            )
        }

        const driver = this.signingDriver.controller(userId)
        const keys = await driver.getKeys().then(handleSigningError)
        const key = keys?.keys?.find((k) => k.name === 'Canton Party')
        if (!key) throw new Error('Fireblocks key not found')

        const { signature, status } = await driver
            .getTransaction({
                userId,
                txId: existingWallet.externalTxId,
            })
            .then(handleSigningError)

        let walletUpdate: UpdateWallet = {
            partyId: existingWallet.partyId,
            networkId: existingWallet.networkId,
        }
        if (status === 'signed') {
            if (!signature) {
                throw new Error(
                    'Transaction signed but no signature found in result'
                )
            }
            const partyId =
                await this.partyAllocator.allocatePartyWithExistingWallet(
                    existingWallet.namespace,
                    existingWallet.topologyTransactions.split(', '),
                    Buffer.from(signature, 'hex').toString('base64'),
                    userId
                )
            walletUpdate = {
                ...walletUpdate,
                partyId,
                status: 'allocated',
                reason: '',
            }
        } else if (status === 'pending') {
            walletUpdate = {
                ...walletUpdate,
                status: 'initialized',
                reason: WALLET_DISABLED_REASON.TOPOLOGY_TRANSACTION_PENDING,
            }
        } else {
            const reason =
                status === 'rejected'
                    ? WALLET_DISABLED_REASON.TOPOLOGY_TRANSACTION_REJECTED
                    : WALLET_DISABLED_REASON.TOPOLOGY_TRANSACTION_FAILED
            walletUpdate = {
                ...walletUpdate,
                status: 'removed',
                disabled: true,
                reason,
            }
        }

        return this.store.updateWallet(walletUpdate)
    }
}
