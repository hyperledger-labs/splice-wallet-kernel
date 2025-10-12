// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LedgerClient } from '@canton-network/core-ledger-client'
import { AuthContext } from '@canton-network/core-wallet-auth'
import { Store, Wallet } from '@canton-network/core-wallet-store'
import { Logger } from 'pino'

export class WalletSyncService {
    constructor(
        private store: Store,
        private ledgerClient: LedgerClient,
        private authContext: AuthContext,
        private logger: Logger
    ) {}

    async run(timeoutMs: number): Promise<void> {
        while (true) {
            await this.syncWallets()
            await new Promise((res) => setTimeout(res, timeoutMs))
        }
    }

    async syncWallets(): Promise<void> {
        this.logger.info('Starting wallet sync...')
        try {
            const network = await this.store.getCurrentNetwork()

            // Get existing parties from participant
            const ledgerClient = new LedgerClient(
                new URL(network.ledgerApi.baseUrl),
                this.authContext!.accessToken,
                this.logger
            )
            const rights = await ledgerClient.get(
                '/v2/users/{user-id}/rights',
                {
                    path: {
                        'user-id': this.authContext!.userId,
                    },
                }
            )
            const parties = rights.rights
                ?.filter((right) => 'CanActAs' in right.kind)
                .map((right) => {
                    if ('CanActAs' in right.kind) {
                        return right.kind.CanActAs.value.party
                    }
                    throw new Error('Unexpected right kind')
                })
            this.logger.info(
                parties,
                'Found new parties to sync with Wallet Gateway'
            )

            // Add new Wallets given the found parties
            const existingWallets = await this.store.getWallets()
            const existingPartyIdToSigningProvider = new Map(
                existingWallets.map((w) => [w.partyId, w.signingProviderId])
            )

            const newParticipantWallets: Array<Wallet> =
                parties
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

            newParticipantWallets.forEach(this.store.addWallet)
            this.logger.info(newParticipantWallets, 'Created new wallets')

            // Set primary wallet if none exists
            const wallets = await this.store.getWallets()
            const hasPrimary = wallets.some((w) => w.primary)
            if (!hasPrimary && wallets.length > 0) {
                this.store.setPrimaryWallet(wallets[0].partyId)
            }
            this.logger.info(`Set ${wallets[0].partyId} as primary wallet`)

            this.logger.debug(wallets, 'Wallet sync completed.')
        } catch {
            return
        }
    }
}
