// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    LedgerClient,
    defaultRetryableOptions,
} from '@canton-network/core-ledger-client'
import { AuthContext } from '@canton-network/core-wallet-auth'
import { Store, Wallet } from '@canton-network/core-wallet-store'
import {
    SigningDriverInterface,
    SigningProvider,
} from '@canton-network/core-signing-lib'
import { Logger } from 'pino'
import { PartyAllocationService } from './party-allocation-service.js'

export type WalletSyncReport = {
    added: Wallet[]
    removed: Wallet[]
}
export class WalletSyncService {
    constructor(
        private store: Store,
        private ledgerClient: LedgerClient,
        private authContext: AuthContext,
        private logger: Logger,
        private signingDrivers: Partial<
            Record<SigningProvider, SigningDriverInterface>
        > = {},
        private partyAllocator: PartyAllocationService
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

    protected async resolveSigningProvider(
        namespace: string,
        isLocal?: boolean
    ): Promise<
        | { signingProviderId: SigningProvider.PARTICIPANT }
        | {
              signingProviderId: Exclude<
                  SigningProvider,
                  SigningProvider.PARTICIPANT
              >
              publicKey: string
          }
    > {
        try {
            // If isLocal is false, skip participant check (definitely external party)
            // If isLocal is true or undefined, check participant namespace first
            if (isLocal !== false) {
                let participantNamespace: string | undefined
                try {
                    const { participantId } =
                        await this.ledgerClient.getWithRetry(
                            '/v2/parties/participant-id',
                            defaultRetryableOptions
                        )
                    participantNamespace = participantId
                } catch (err) {
                    this.logger.warn(
                        { err },
                        'Failed to get participant namespace'
                    )
                }

                if (
                    participantNamespace &&
                    namespace === participantNamespace
                ) {
                    return { signingProviderId: SigningProvider.PARTICIPANT }
                }
            }

            // Get keys from signing providers try to match
            const userId = this.authContext?.userId
            for (const [providerId, driver] of Object.entries(
                this.signingDrivers
            )) {
                if (!driver) continue

                // Participant already handled above
                if (providerId === SigningProvider.PARTICIPANT) {
                    continue
                }

                try {
                    const controller = driver.controller(userId)
                    const result = await controller.getKeys()

                    // In case of error getKeys resolve Promise but with error object
                    if ('error' in result) {
                        this.logger.debug(
                            {
                                providerId,
                                error: result.error,
                                error_description: result.error_description,
                            },
                            'Failed to get keys from signing provider'
                        )
                        continue
                    }

                    // Try to match namespace with public keys
                    if (result.keys) {
                        for (const key of result.keys) {
                            const normalizedKey =
                                this.partyAllocator.normalizePublicKeyToBase64(
                                    key.publicKey
                                )
                            if (!normalizedKey) continue

                            const keyNamespace =
                                this.partyAllocator.createFingerprintFromKey(
                                    normalizedKey
                                )
                            if (keyNamespace === namespace) {
                                this.logger.debug(
                                    {
                                        namespace,
                                        providerId,
                                        keyId: key.id,
                                        publicKey: key.publicKey,
                                    },
                                    'Matched namespace with signing provider'
                                )
                                return {
                                    signingProviderId:
                                        providerId as SigningProvider,
                                    publicKey: key.publicKey,
                                }
                            }
                        }
                    }
                } catch (err) {
                    this.logger.debug(
                        { err, providerId },
                        'Error getting keys from signing provider'
                    )
                    // Continue to next signing provider
                }
            }

            // Default to participant if no match found
            this.logger.debug(
                { namespace },
                'No signing provider match found, defaulting to participant'
            )
            return { signingProviderId: SigningProvider.PARTICIPANT }
        } catch (err) {
            this.logger.error(
                { err, namespace },
                'Error resolving signing provider, defaulting to participant'
            )
            return { signingProviderId: SigningProvider.PARTICIPANT }
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

            // Resolve signing providers for all new parties
            const newParties = Array.from(partiesWithRights.keys()).filter(
                (party) => !existingPartyIdToSigningProvider.has(party)
                // todo: filter on idp id
            )

            const newParticipantWallets: Array<Wallet> = await Promise.all(
                newParties.map(async (party) => {
                    const [hint, namespace] = party.split('::')

                    // Get party details to check isLocal flag
                    let isLocal: boolean | undefined
                    try {
                        const partyDetails =
                            await this.ledgerClient.getWithRetry(
                                '/v2/parties/{party}',
                                defaultRetryableOptions,
                                {
                                    path: { party },
                                }
                            )
                        // PartyDetails is an array, get the first matching party
                        const details = partyDetails.partyDetails?.find(
                            (p) => p.party === party
                        )
                        isLocal = details?.isLocal
                        this.logger.debug(
                            { party, isLocal },
                            'Retrieved party details'
                        )
                    } catch (err) {
                        this.logger.debug(
                            { err, party },
                            'Failed to get party details, proceeding without isLocal'
                        )
                        // Continue without isLocal - will check both paths
                    }

                    // const { signingProviderId, publicKey } =
                    const resolvedSigningProvider =
                        await this.resolveSigningProvider(namespace, isLocal)

                    // Namespace is saved as public key in case of participant
                    const walletPublicKey =
                        resolvedSigningProvider.signingProviderId ===
                        SigningProvider.PARTICIPANT
                            ? namespace
                            : resolvedSigningProvider.publicKey

                    this.logger.info(
                        {
                            primary: false,
                            status: 'allocated',
                            partyId: party,
                            hint: hint,
                            publicKey: walletPublicKey,
                            namespace: namespace,
                            networkId: network.id,
                            signingProviderId:
                                resolvedSigningProvider.signingProviderId,
                        },
                        'Wallet sync result'
                    )

                    return {
                        primary: false,
                        status: 'allocated',
                        partyId: party,
                        hint: hint,
                        publicKey: walletPublicKey,
                        namespace: namespace,
                        networkId: network.id,
                        signingProviderId:
                            resolvedSigningProvider.signingProviderId,
                    } as Wallet
                })
            )

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
