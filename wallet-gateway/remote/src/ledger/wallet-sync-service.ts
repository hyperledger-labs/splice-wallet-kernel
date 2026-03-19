// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    LedgerClient,
    defaultRetryableOptions,
} from '@canton-network/core-ledger-client'
import { AuthContext } from '@canton-network/core-wallet-auth'
import {
    Store,
    Wallet,
    PartyLevelRight,
} from '@canton-network/core-wallet-store'
import {
    SigningDriverInterface,
    SigningProvider,
} from '@canton-network/core-signing-lib'
import { Logger } from 'pino'
import { PartyAllocationService } from './party-allocation-service.js'
import { SyncWalletsResult } from '../user-api/rpc-gen/typings.js'
import { WALLET_DISABLED_REASON } from '@canton-network/core-types'

enum UserLevelRight {
    CanReadAsAnyParty = 'CanReadAsAnyParty',
    CanExecuteAsAnyParty = 'CanExecuteAsAnyParty',
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

    private static readonly EMPTY_RIGHTS: PartyLevelRight[] = []

    private sameRights(
        left?: PartyLevelRight[],
        right: PartyLevelRight[] = WalletSyncService.EMPTY_RIGHTS
    ): boolean {
        const leftSet = new Set(left ?? WalletSyncService.EMPTY_RIGHTS)
        const rightSet = new Set(right)
        if (leftSet.size !== rightSet.size) return false
        return [...leftSet].every((item) => rightSet.has(item))
    }

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
                const { participantId } = await this.ledgerClient.getWithRetry(
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
                        this.logger.warn(
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
                                this.logger.info(
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
                    this.logger.error(
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

    private async getRightsSnapshot(): Promise<{
        rightsByParty: Map<string, PartyLevelRight[]>
        rightsByUser: Map<string, Set<UserLevelRight>>
    }> {
        const rights = await this.ledgerClient.getWithRetry(
            '/v2/users/{user-id}/rights',
            defaultRetryableOptions,
            {
                path: {
                    'user-id': this.authContext!.userId,
                },
            }
        )

        const rightsByParty = new Map<string, Set<PartyLevelRight>>()
        const rightsByUser = new Map<string, Set<UserLevelRight>>([
            [this.authContext.userId, new Set<UserLevelRight>()],
        ])

        const getOrCreateRights = (party: string): Set<PartyLevelRight> => {
            const existing = rightsByParty.get(party)
            if (existing) return existing
            const created = new Set<PartyLevelRight>()
            rightsByParty.set(party, created)
            return created
        }

        rights.rights?.forEach((right) => {
            if ('CanActAs' in right.kind) {
                const party = right.kind.CanActAs.value.party
                getOrCreateRights(party).add(PartyLevelRight.CanActAs)
            } else if ('CanExecuteAs' in right.kind) {
                const party = right.kind.CanExecuteAs.value.party
                getOrCreateRights(party).add(PartyLevelRight.CanExecuteAs)
            } else if ('CanReadAs' in right.kind) {
                const party = right.kind.CanReadAs.value.party
                getOrCreateRights(party).add(PartyLevelRight.CanReadAs)
            } else if ('CanReadAsAnyParty' in right.kind) {
                rightsByUser
                    .get(this.authContext.userId)
                    ?.add(UserLevelRight.CanReadAsAnyParty)
            } else if ('CanExecuteAsAnyParty' in right.kind) {
                rightsByUser
                    .get(this.authContext.userId)
                    ?.add(UserLevelRight.CanExecuteAsAnyParty)
            }
        })

        return {
            rightsByParty: new Map(
                [...rightsByParty.entries()].map(([party, rights]) => [
                    party,
                    [...rights],
                ])
            ),
            rightsByUser,
        }
    }

    async isWalletSyncNeeded(): Promise<boolean> {
        try {
            const network = await this.store.getCurrentNetwork()
            const existingWallets = await this.store.getWallets()
            const { rightsByParty } = await this.getRightsSnapshot()
            const partiesWithRights = Array.from(rightsByParty.keys())

            // Treat disabled wallets as if they don't exist, so they can be re-synced
            const enabledWallets = existingWallets.filter((w) => !w.disabled)
            // Track by (partyId, networkId) combination to handle multi-hosted parties
            const existingPartyNetworkPairs = new Set(
                enabledWallets.map((w) => `${w.partyId}:${w.networkId}`)
            )

            // Check if there are parties on ledger that aren't in store for this network
            const hasNewPartiesOnLedger = partiesWithRights.some(
                (party) =>
                    !existingPartyNetworkPairs.has(`${party}:${network.id}`)
            )
            if (hasNewPartiesOnLedger) return true

            // Check if there are allocated wallets in store whose party is not on ledger
            const hasWalletsWithoutParty = enabledWallets.some(
                (wallet) =>
                    wallet.status === 'allocated' &&
                    !partiesWithRights.includes(wallet.partyId)
            )

            const hasChangedRights = enabledWallets.some((wallet) => {
                if (wallet.status !== 'allocated') return false
                const nextRights = rightsByParty.get(wallet.partyId)
                if (!nextRights) return false
                return !this.sameRights(wallet.rights, nextRights)
            })
            return hasWalletsWithoutParty || hasChangedRights
        } catch (err) {
            this.logger.error({ err }, 'Error checking if sync is needed')
            // On error, return false to avoid showing sync button unnecessarily
            throw err
        }
    }

    // Participant wallets: disable when party not on ledger (participant node reset, namespace changed).
    // Other wallets: mark as initialized so user can re-allocate (e.g. after external signing).
    private async handleWalletsWithoutParty(
        enabledWallets: Wallet[],
        partiesWithRights: Set<string>
    ): Promise<{
        markedForAllocateWallets: Wallet[]
        walletsWithoutParty: Wallet[]
        disabledExistingWallets: Wallet[]
    }> {
        const walletsWithoutParty = enabledWallets.filter(
            (wallet) => !partiesWithRights.has(wallet.partyId)
        )
        const markedForAllocateWallets: Wallet[] = []
        const disabledExistingWallets: Wallet[] = []

        for (const wallet of walletsWithoutParty) {
            if (wallet.status !== 'allocated') continue

            try {
                if (wallet.signingProviderId === SigningProvider.PARTICIPANT) {
                    this.logger.warn(
                        {
                            partyId: wallet.partyId,
                            signingProviderId: wallet.signingProviderId,
                        },
                        'Participant wallet party not on ledger, disabling (participant namespace changed)'
                    )
                    await this.store.updateWallet({
                        partyId: wallet.partyId,
                        networkId: wallet.networkId,
                        disabled: true,
                        reason: WALLET_DISABLED_REASON.PARTICIPANT_NAMESPACE_CHANGED,
                        ...(wallet.primary && { primary: false }),
                    })
                    disabledExistingWallets.push(wallet)
                } else {
                    this.logger.info(
                        {
                            partyId: wallet.partyId,
                            signingProviderId: wallet.signingProviderId,
                        },
                        'Party not found on participant, marking wallet as initialized'
                    )
                    await this.store.updateWallet({
                        partyId: wallet.partyId,
                        networkId: wallet.networkId,
                        status: 'initialized',
                        ...(wallet.primary && { primary: false }),
                    })
                    markedForAllocateWallets.push(wallet)
                }
            } catch (err) {
                this.logger.warn(
                    { err, partyId: wallet.partyId },
                    'Failed to update wallet'
                )
            }
        }

        return {
            markedForAllocateWallets,
            walletsWithoutParty,
            disabledExistingWallets,
        }
    }

    // Creates wallets for parties user has rights to
    private async handlePartiesWithoutWallet(
        newParties: string[],
        networkId: string,
        rightsByParty: Map<string, PartyLevelRight[]>
    ): Promise<Wallet[]> {
        return await Promise.all(
            newParties.map(async (partyId) => {
                const [hint, namespace] = partyId.split('::')

                const resolvedSigningProvider =
                    await this.resolveSigningProvider(namespace)

                const isMatched = resolvedSigningProvider.matched

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
                    partyId,
                    hint,
                    publicKey: walletPublicKey,
                    namespace,
                    networkId,
                    signingProviderId:
                        resolvedSigningProvider.signingProviderId,
                    disabled: !isMatched,
                    rights:
                        rightsByParty.get(partyId) ??
                        WalletSyncService.EMPTY_RIGHTS,
                    ...(!isMatched && {
                        reason: WALLET_DISABLED_REASON.NO_SIGNING_PROVIDER_MATCHED,
                    }),
                }

                this.logger.info({ ...wallet }, 'Wallet sync result')
                await this.store.addWallet(wallet)
                return wallet
            })
        )
    }

    private async handleRightsUpdates(
        existingAllocatedWallets: Wallet[],
        rightsByParty: Map<string, PartyLevelRight[]>
    ): Promise<Wallet[]> {
        const updatedWallets: Wallet[] = []

        for (const wallet of existingAllocatedWallets) {
            const nextRights = rightsByParty.get(wallet.partyId)
            if (!nextRights) continue
            if (this.sameRights(wallet.rights, nextRights)) continue

            await this.store.updateWallet({
                partyId: wallet.partyId,
                networkId: wallet.networkId,
                rights: nextRights,
            })
            updatedWallets.push({ ...wallet, rights: nextRights })
        }

        return updatedWallets
    }

    async syncWallets(): Promise<SyncWalletsResult> {
        this.logger.info('Starting wallet sync...')
        try {
            const network = await this.store.getCurrentNetwork()
            this.logger.info(network, 'Current network')

            const { rightsByParty } = await this.getRightsSnapshot()
            const partiesWithRights = Array.from(rightsByParty.keys())

            const existingWallets = await this.store.getWallets()
            this.logger.info(existingWallets, 'Existing wallets')
            // Skips wallets for which we didn't allocate a party
            const existingAllocatedWallets = existingWallets.filter(
                (w) => w.status === 'allocated'
            )
            const existingPartiesOnNetwork = new Set(
                existingAllocatedWallets.map(
                    (w) => `${w.partyId}:${w.networkId}`
                )
            )

            const newParties = partiesWithRights.filter(
                (party) =>
                    !existingPartiesOnNetwork.has(`${party}:${network.id}`)
                // todo: filter on idp id
            )

            const {
                markedForAllocateWallets,
                walletsWithoutParty,
                disabledExistingWallets,
            } = await this.handleWalletsWithoutParty(
                existingAllocatedWallets,
                new Set(partiesWithRights)
            )

            const rightsUpdatedWallets = await this.handleRightsUpdates(
                existingAllocatedWallets,
                rightsByParty
            )

            this.logger.info(
                {
                    newParties,
                    markedForAllocate: markedForAllocateWallets.map(
                        (w) => w.partyId
                    ),
                },
                'Wallets without parties'
            )

            const newParticipantWallets = await this.handlePartiesWithoutWallet(
                newParties,
                network.id,
                rightsByParty
            )

            // Set primary wallet if none exists, or if primary is on an initialized wallet
            const networkWallets = await this.store.getWallets()
            const primaryWallet = networkWallets.find((w) => w.primary)
            const allocatedWallets = networkWallets.filter(
                (w) => w.status === 'allocated' && !w.disabled
            )
            const needsPrimaryReset =
                primaryWallet?.status === 'initialized' ||
                (!primaryWallet && allocatedWallets.length > 0)
            if (needsPrimaryReset && allocatedWallets.length > 0) {
                this.store.setPrimaryWallet(allocatedWallets[0].partyId)
                this.logger.info(
                    `Set ${allocatedWallets[0].partyId} as primary wallet in network ${network.id}`
                )
            }

            const disabled = [
                ...newParticipantWallets.filter((wallet) => wallet.disabled),
                ...disabledExistingWallets,
            ]

            this.logger.info(
                {
                    added: newParticipantWallets,
                    updated: [...walletsWithoutParty, ...rightsUpdatedWallets],
                    disabled: disabled,
                },
                'Wallet sync completed.'
            )

            return {
                added: newParticipantWallets,
                updated: [...walletsWithoutParty, ...rightsUpdatedWallets],
                disabled: disabled,
            }
        } catch (err) {
            this.logger.error({ err }, 'Wallet sync failed.')
            throw err
        }
    }
}
