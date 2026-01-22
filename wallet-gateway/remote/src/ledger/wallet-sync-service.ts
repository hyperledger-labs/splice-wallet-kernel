// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
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

export const WALLET_DISABLED_REASON = {
    NO_SIGNING_PROVIDER_MATCHED: 'no signing provider matched',
}

export class WalletSyncService {
    constructor(
        private store: Store,
        private ledgerClient: LedgerClient,
        private adminLedgerClient: LedgerClient,
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

    protected async resolveSigningProvider(namespace: string): Promise<
        | {
              signingProviderId: SigningProvider.PARTICIPANT
              matched: boolean
          }
        | {
              signingProviderId: Exclude<
                  SigningProvider,
                  SigningProvider.PARTICIPANT
              >
              publicKey: string
              matched: boolean
          }
    > {
        try {
            // Check if namespace matches participant namespace first
            // (participant parties have namespace === participantId's namespace)
            let participantNamespace: string | undefined
            try {
                const { participantId } =
                    await this.adminLedgerClient.getWithRetry(
                        '/v2/parties/participant-id',
                        defaultRetryableOptions
                    )
                // Extract the namespace part from participantId
                // Format is hint::namespace
                const [, extractedNamespace] = participantId.split('::')
                if (extractedNamespace) {
                    participantNamespace = extractedNamespace
                } else {
                    this.logger.warn(
                        { participantId },
                        `Invalid participantId format: expected "hint::namespace", got "${participantId}"`
                    )
                }
            } catch (err) {
                this.logger.warn({ err }, 'Failed to get participant namespace')
            }

            if (participantNamespace && namespace === participantNamespace) {
                return {
                    signingProviderId: SigningProvider.PARTICIPANT,
                    matched: true,
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
                                    matched: true,
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

            // No match found - use participant as default provider
            this.logger.warn(
                { namespace },
                'No signing provider match found for namespace, using participant as default and marking wallet as unmatched (disabled)'
            )
            return {
                signingProviderId: SigningProvider.PARTICIPANT,
                matched: false,
            }
        } catch (err) {
            this.logger.error(
                { err, namespace },
                'Error resolving signing provider, using participant as default and marking wallet as unmatched (disabled)'
            )
            // On error, use participant as default but mark as unmatched
            return {
                signingProviderId: SigningProvider.PARTICIPANT,
                matched: false,
            }
        }
    }

    private async getPartiesRightsMap(): Promise<Map<string, string>> {
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

        return partiesWithRights
    }

    async isWalletSyncNeeded(): Promise<boolean> {
        try {
            const network = await this.store.getCurrentNetwork()

            const existingWallets = await this.store.getWallets({
                networkIds: [network.id],
            })

            const hasDisabledWallets = existingWallets.some((w) => w.disabled)
            if (hasDisabledWallets) {
                return true
            }

            const partiesWithRights = await this.getPartiesRightsMap()

            // Treat disabled wallets as if they don't exist, so they can be re-synced
            const enabledWallets = existingWallets.filter((w) => !w.disabled)
            // Track by (partyId, networkId) combination to handle multi-hosted parties
            const existingPartyNetworkPairs = new Set(
                enabledWallets.map((w) => `${w.partyId}:${w.networkId}`)
            )

            // Check if there are parties on ledger that aren't in store for this network
            return Array.from(partiesWithRights.keys()).some(
                (party) =>
                    !existingPartyNetworkPairs.has(`${party}:${network.id}`)
            )
        } catch (err) {
            this.logger.error({ err }, 'Error checking if sync is needed')
            // On error, return false to avoid showing sync button unnecessarily
            throw err
        }
    }
    async syncWallets(): Promise<WalletSyncReport> {
        this.logger.info('Starting wallet sync...')
        try {
            const network = await this.store.getCurrentNetwork()
            this.logger.info(network, 'Current network')

            // Get existing parties from participant
            const partiesWithRights = await this.getPartiesRightsMap()

            // Add new Wallets given the found parties
            // Only check wallets in the current network
            const existingWallets = await this.store.getWallets({
                networkIds: [network.id],
            })
            this.logger.info(existingWallets, 'Existing wallets')
            // Treat disabled wallets as if they don't exist, so they can be re-synced
            const enabledWallets = existingWallets.filter((w) => !w.disabled)
            // Track by (partyId, networkId) combination
            const existingPartyNetworkToSigningProvider = new Map(
                enabledWallets.map((w) => [
                    `${w.partyId}:${w.networkId}`,
                    w.signingProviderId,
                ])
            )

            // Track disabled wallets by (partyId, networkId) combination
            const disabledPartyNetworkPairs = new Set(
                existingWallets
                    .filter((w) => w.disabled)
                    .map((w) => `${w.partyId}:${w.networkId}`)
            )

            // Resolve signing providers for all new parties
            // Check if (partyId, networkId) combination already exists
            const newParties = Array.from(partiesWithRights.keys()).filter(
                (party) =>
                    !existingPartyNetworkToSigningProvider.has(
                        `${party}:${network.id}`
                    )
                // todo: filter on idp id
            )

            this.logger.info(
                { newParties },
                'Found new parties to sync with Wallet Gateway'
            )

            const newParticipantWallets: Wallet[] = await Promise.all(
                newParties.map(async (party) => {
                    const [hint, namespace] = party.split('::')

                    const resolvedSigningProvider =
                        await this.resolveSigningProvider(namespace)

                    // resolvedSigningProvider is never null (participant is default)
                    const isMatched = resolvedSigningProvider.matched

                    // Namespace is saved as public key in case of participant
                    const walletPublicKey =
                        resolvedSigningProvider.signingProviderId ===
                        SigningProvider.PARTICIPANT
                            ? namespace
                            : 'publicKey' in resolvedSigningProvider
                              ? resolvedSigningProvider.publicKey
                              : namespace

                    const wallet: Wallet = {
                        primary: false,
                        status: 'allocated',
                        partyId: party,
                        hint: hint,
                        publicKey: walletPublicKey,
                        namespace: namespace,
                        networkId: network.id,
                        signingProviderId:
                            resolvedSigningProvider.signingProviderId,
                        disabled: !isMatched,
                        ...(!isMatched && {
                            reason: WALLET_DISABLED_REASON.NO_SIGNING_PROVIDER_MATCHED,
                        }),
                    }

                    this.logger.info(
                        {
                            ...wallet,
                        },
                        'Wallet sync result'
                    )

                    return wallet
                })
            )

            // Remove disabled wallets that are being re-synced before adding them back
            // Filter by (partyId, networkId) combination
            await Promise.all(
                newParticipantWallets
                    .filter((wallet) =>
                        disabledPartyNetworkPairs.has(
                            `${wallet.partyId}:${wallet.networkId}`
                        )
                    )
                    .map((wallet) => {
                        this.logger.info(
                            {
                                partyId: wallet.partyId,
                                networkId: wallet.networkId,
                            },
                            'Removing disabled wallet for re-sync'
                        )
                        return this.store.removeWallet(wallet.partyId)
                    })
            )

            await Promise.all(
                newParticipantWallets.map((wallet) =>
                    this.store.addWallet(wallet)
                )
            )
            this.logger.info({ newParticipantWallets }, 'Created new wallets')
            this.logger.info(
                {
                    totalProcessed: newParties.length,
                    added: newParticipantWallets.length,
                    disabled: newParticipantWallets.filter((w) => w.disabled)
                        .length,
                },
                'Wallet sync summary'
            )

            // Set primary wallet if none exists in current network
            const networkWallets = await this.store.getWallets({
                networkIds: [network.id],
            })
            const hasPrimary = networkWallets.some((w) => w.primary)
            if (!hasPrimary && networkWallets.length > 0) {
                this.store.setPrimaryWallet(networkWallets[0].partyId)
                this.logger.info(
                    `Set ${networkWallets[0].partyId} as primary wallet in network ${network.id}`
                )
            }

            this.logger.debug(
                { wallets: newParticipantWallets },
                'Wallet sync completed.'
            )
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
