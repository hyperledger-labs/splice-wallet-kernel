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

/**
 * Dfns provisions Canton wallets through its validator integration: when we ask
 * Dfns to create a key it also activates the wallet on Canton, so the Gateway
 * does not run its own topology-transaction flow. We just record the wallet.
 */
export class DfnsWalletAllocator implements WalletAllocator {
    constructor(
        private store: Store,
        private logger: Logger,
        private partyAllocator: PartyAllocationService,
        private signingDriver: SigningDriverInterface
    ) {}

    async createWallet(
        userId: UserId,
        email: string | undefined,
        partyHint: PartyHint,
        primary: Primary = false
    ): Promise<Wallet> {
        const driver = this.signingDriver.controller(userId)
        const key = await driver
            .createKey({ name: partyHint })
            .then(handleSigningError)

        const namespace = this.partyAllocator.createFingerprintFromKey(
            key.publicKey
        )
        const network = await this.store.getCurrentNetwork()

        const wallet: Wallet = {
            partyId: `${partyHint}::${namespace}`,
            hint: partyHint,
            namespace,
            signingProviderId: SigningProvider.DFNS,
            networkId: network.id,
            status: 'allocated',
            primary,
            publicKey: key.publicKey,
            externalTxId: key.id,
            topologyTransactions: '',
            rights: [],
        }
        this.logger.info(
            { walletId: key.id, partyId: wallet.partyId },
            'Created Dfns wallet'
        )
        await this.store.addWallet(wallet)
        return wallet
    }

    async allocateParty(
        userId: UserId,
        email: string | undefined,
        existingWallet: Wallet
    ): Promise<void> {
        // Dfns activates the wallet on Canton when it is created, so re-allocation
        // is just a state refresh — confirm the wallet is still resolvable in Dfns
        // and ensure its status is `allocated`.
        const driver = this.signingDriver.controller(userId)
        await driver
            .getKeys()
            .then(handleSigningError)
            .then((res) => {
                const found = res.keys?.some(
                    (k) => k.publicKey === existingWallet.publicKey
                )
                if (!found) {
                    throw new Error(
                        `Dfns wallet for party ${existingWallet.partyId} not found`
                    )
                }
            })

        const update: UpdateWallet = {
            partyId: existingWallet.partyId,
            networkId: existingWallet.networkId,
            status: 'allocated',
        }
        return this.store.updateWallet(update)
    }
}
