// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LedgerClient } from '@canton-network/core-ledger-client'
import { defaultRetryableOptions } from '@canton-network/core-ledger-client/dist/ledger-api-utils.js'
import { AuthContext } from '@canton-network/core-wallet-auth'
import { Store, Wallet } from '@canton-network/core-wallet-store'
import { Logger } from 'pino'

export type WalletSyncReport = {
    added: Wallet[]
    removed: Wallet[]
}
export class WalletSyncService {
    constructor(
        private store: Store,
        private ledgerClient: LedgerClient,
        private authContext: AuthContext,
        private logger: Logger
    ) {}

    async run(timeoutMs: number): Promise<void> {
        this.logger.info(
            `Starting wallet sync service with ${timeoutMs}ms interval`
        )
        while (true) {
            await this.syncWallets()
            await new Promise((res) => setTimeout(res, timeoutMs))
        }
    }

    async syncWallets(): Promise<WalletSyncReport> {
        this.logger.info('Starting wallet sync...')
        try {
            const network = await this.store.getCurrentNetwork()
            this.logger.info(network, 'Current network')

            // Get existing parties from participant
            const rights = await this.ledgerClient.getWithRetry(
                '/v2/users/{user-id}/rights',
                defaultRetryableOptions,
                {
                    path: {
                        'user-id': this.authContext!.userId,
                    },
                }
            )
            const partiesWithRights = new Map<string, string>()

            rights.rights?.forEach((right) => {
                let party: string | undefined
                let rightType: string | undefined
                if ('CanActAs' in right.kind) {
                    party = right.kind.CanActAs.value.party
                    rightType = 'CanActAs'
                } else if ('CanExecuteAs' in right.kind) {
                    party = right.kind.CanExecuteAs.value.party
                    rightType = 'CanExecuteAs'
                } else if ('CanReadAs' in right.kind) {
                    party = right.kind.CanReadAs.value.party
                    rightType = 'CanReadAs'
                }
                if (
                    party !== undefined &&
                    rightType !== undefined &&
                    !partiesWithRights.has(party)
                )
                    partiesWithRights.set(party, rightType)
            })
            this.logger.info(
                partiesWithRights,
                'Found new parties to sync with Wallet Gateway'
            )

            // Add new Wallets given the found parties
            const existingWallets = await this.store.getWallets()
            this.logger.info(existingWallets, 'Existing wallets')
            const existingPartyIdToSigningProvider = new Map(
                existingWallets.map((w) => [w.partyId, w.signingProviderId])
            )

            const newParticipantWallets: Array<Wallet> =
                Array.from(partiesWithRights.keys())
                    ?.filter(
                        (party) => !existingPartyIdToSigningProvider.has(party)
                        // todo: filter on idp id
                    )
                    .map((party) => {
                        const [hint, namespace] = party.split('::')
                        return {
                            primary: false,
                            partyId: party,
                            hint: hint,
                            publicKey: namespace,
                            namespace: namespace,
                            chainId: network.chainId,
                            signingProviderId: 'participant', // todo: determine based on partyDetails.isLocal
                        }
                    }) || []

            await Promise.all(
                newParticipantWallets.map((wallet) =>
                    this.store.addWallet(wallet)
                )
            )
            this.logger.info(newParticipantWallets, 'Created new wallets')

            // Set primary wallet if none exists
            const wallets = await this.store.getWallets()
            const hasPrimary = wallets.some((w) => w.primary)
            if (!hasPrimary && wallets.length > 0) {
                this.store.setPrimaryWallet(wallets[0].partyId)
                this.logger.info(`Set ${wallets[0].partyId} as primary wallet`)
            }

            this.logger.debug(wallets, 'Wallet sync completed.')
            return {
                added: newParticipantWallets,
                removed: [],
            } as WalletSyncReport
        } catch (err) {
            this.logger.error({ err }, 'Wallet sync failed.')
            throw err
        }
    }
}
