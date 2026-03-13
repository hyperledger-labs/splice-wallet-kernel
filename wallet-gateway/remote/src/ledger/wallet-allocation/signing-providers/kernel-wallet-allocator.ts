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
function handleSigningError<T extends object>(result: SigningError | T): T {
    if ('error' in result) {
        throw new Error(
            `Error from signing driver: ${result.error_description}`
        )
    }
    return result
}

export class KernelWalletAllocator implements WalletAllocator {
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
        const key = await driver
            .createKey({
                name: partyHint,
            })
            .then(handleSigningError)

        const party = await this.partyAllocator.allocateParty(
            userId,
            partyHint,
            key.publicKey,
            async (hash) => {
                const { signature } = await driver
                    .signTransaction({
                        tx: '',
                        txHash: hash,
                        keyIdentifier: {
                            publicKey: key.publicKey,
                        },
                    })
                    .then(handleSigningError)

                if (!signature) {
                    throw new Error('No signature returned from signing driver')
                }

                return signature
            }
        )

        const network = await this.store.getCurrentNetwork()
        const wallet: Wallet = {
            partyId: party.partyId,
            hint: party.hint,
            namespace: party.namespace,
            signingProviderId: SigningProvider.WALLET_KERNEL,
            networkId: network.id,
            status: 'allocated',
            primary,
            publicKey: key.publicKey,
            externalTxId: '',
            topologyTransactions: '',
        }
        await this.store.addWallet(wallet)
        return wallet
    }

    async allocateParty(userId: UserId, existingWallet: Wallet): Promise<void> {
        const driver = this.signingDriver.controller(userId)
        const signingCallback = async (hash: string) => {
            const result = await driver
                .signTransaction({
                    tx: '',
                    txHash: hash,
                    keyIdentifier: { publicKey: existingWallet.publicKey },
                })
                .then(handleSigningError)

            if (!result.signature) {
                throw new Error('No signature returned from signing driver')
            }
            return result.signature
        }

        const party = await this.partyAllocator.allocateParty(
            userId,
            existingWallet.hint,
            existingWallet.publicKey,
            signingCallback
        )

        const network = await this.store.getCurrentNetwork()
        const updateWallet: UpdateWallet = {
            networkId: network.id,
            partyId: party.partyId,
            status: 'allocated',
        }

        return await this.store.updateWallet(updateWallet)
    }
}
