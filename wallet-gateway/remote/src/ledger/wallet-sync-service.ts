// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    type LedgerClient,
    defaultRetryableOptions,
} from '@canton-network/core-ledger-client'
import type { AuthContext } from '@canton-network/core-wallet-auth'
import {
    type Store,
    type Wallet,
    PartyLevelRight,
    UserLevelRight,
} from '@canton-network/core-wallet-store'
import {
    type SigningDriverInterface,
    SigningProvider,
} from '@canton-network/core-signing-lib'
import type { Logger } from 'pino'
import type { PartyAllocationService } from './party-allocation-service.js'
import type { SyncWalletsResult } from '../user-api/rpc-gen/typings.js'
import { WALLET_DISABLED_REASON } from '@canton-network/core-types'

type RightsSnapshot = {
    rightsByParty: Map<string, PartyLevelRight[]>
    rightsByUser: Map<string, Set<UserLevelRight>>
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
        private partyAllocator?: PartyAllocationService
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

    private async getParticipantNamespace(): Promise<string> {
        const { participantId } = await this.ledgerClient.getWithRetry(
            '/v2/parties/participant-id',
            defaultRetryableOptions
        )
        // Extract the namespace part from participantId
        // Format is hint::namespace
        const [, extractedNamespace] = participantId.split('::')
        if (!extractedNamespace)
            throw new Error(
                `Invalid participantId format: expected "hint::namespace", got "${participantId}"`
            )
        return extractedNamespace
    }

    // Protected for tests
    protected async resolveSigningProvider(
        partyNamespace: string,
        participantNamespace: string
    ): Promise<
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
        const partyAllocator = this.requirePartyAllocator()
        try {
            if (
                participantNamespace &&
                partyNamespace === participantNamespace
            ) {
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
                                partyAllocator.normalizePublicKeyToBase64(
                                    key.publicKey
                                )
                            if (!normalizedKey) continue

                            const keyNamespace =
                                partyAllocator.createFingerprintFromKey(
                                    normalizedKey
                                )

                            if (keyNamespace === partyNamespace) {
                                this.logger.info(
                                    {
                                        namespace: partyNamespace,
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
                { namespace: partyNamespace },
                'No signing provider match found for namespace, using participant as default and marking wallet as unmatched (disabled)'
            )
            return {
                signingProviderId: SigningProvider.PARTICIPANT,
                matched: false,
            }
        } catch (err) {
            this.logger.error(
                { err, namespace: partyNamespace },
                'Error resolving signing provider, using participant as default and marking wallet as unmatched (disabled)'
            )
            // On error, use participant as default but mark as unmatched
            return {
                signingProviderId: SigningProvider.PARTICIPANT,
                matched: false,
            }
        }
    }

    private async getRightsSnapshot(): Promise<RightsSnapshot> {
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
            const kind = right.kind
            if (!kind) return

            if ('CanActAs' in kind) {
                const party = kind.CanActAs.value.party
                getOrCreateRights(party).add(PartyLevelRight.CanActAs)
            } else if ('CanExecuteAs' in kind) {
                const party = kind.CanExecuteAs.value.party
                getOrCreateRights(party).add(PartyLevelRight.CanExecuteAs)
            } else if ('CanReadAs' in kind) {
                const party = kind.CanReadAs.value.party
                getOrCreateRights(party).add(PartyLevelRight.CanReadAs)
            } else if ('CanReadAsAnyParty' in kind) {
                rightsByUser
                    .get(this.authContext.userId)
                    ?.add(UserLevelRight.CanReadAsAnyParty)
            } else if ('CanExecuteAsAnyParty' in kind) {
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
            const { rightsByParty, rightsByUser } =
                await this.getRightsSnapshot()
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

            const currentUserRights = await this.store.getUserRights(network.id)
            const nextUserRights = [
                ...(rightsByUser.get(this.authContext.userId) ??
                    new Set<UserLevelRight>()),
            ]
            const hasChangedUserRights =
                new Set(currentUserRights).size !==
                    new Set(nextUserRights).size ||
                currentUserRights.some(
                    (right) => !nextUserRights.includes(right)
                )

            return (
                hasWalletsWithoutParty ||
                hasChangedRights ||
                hasChangedUserRights
            )
        } catch (err) {
            this.logger.error({ err }, 'Error checking if sync is needed')
            // On error, return false to avoid showing sync button unnecessarily
            throw err
        }
    }

    // Participant wallets: disable when party not on ledger (participant node reset, namespace changed).
    // Other wallets: mark as initialized so user can re-allocate (e.g. after external signing).
    private async handleWalletsWithoutParty(
        allocatedWallets: Wallet[],
        partiesWithRights: Set<string>
    ): Promise<{
        updatedToInitialized: Wallet[]
        updatedToDisabled: Wallet[]
    }> {
        const walletsWithoutParty = allocatedWallets.filter(
            (wallet) => !partiesWithRights.has(wallet.partyId)
        )
        const updatedToInitialized: Wallet[] = []
        const updatedToDisabled: Wallet[] = []

        for (const wallet of walletsWithoutParty) {
            if (wallet.status !== 'allocated' || wallet.disabled) continue

            try {
                if (wallet.signingProviderId === SigningProvider.PARTICIPANT) {
                    this.logger.warn(
                        {
                            partyId: wallet.partyId,
                            signingProviderId: wallet.signingProviderId,
                        },
                        'Participant wallet party not on ledger, disabling (participant namespace changed)'
                    )
                    const disabledWallet: Wallet = {
                        ...wallet,
                        disabled: true,
                        reason: WALLET_DISABLED_REASON.PARTICIPANT_NAMESPACE_CHANGED,
                        ...(wallet.primary && { primary: false }),
                    }
                    await this.store.updateWallet({
                        partyId: wallet.partyId,
                        networkId: wallet.networkId,
                        disabled: true,
                        reason: WALLET_DISABLED_REASON.PARTICIPANT_NAMESPACE_CHANGED,
                        ...(wallet.primary && { primary: false }),
                    })
                    updatedToDisabled.push(disabledWallet)
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
                    const reinitialized: Wallet = {
                        ...wallet,
                        status: 'initialized',
                        ...(wallet.primary && { primary: false }),
                    }
                    updatedToInitialized.push(reinitialized)
                }
            } catch (err) {
                this.logger.warn(
                    { err, partyId: wallet.partyId },
                    'Failed to update wallet'
                )
            }
        }

        return {
            updatedToInitialized,
            updatedToDisabled,
        }
    }

    // Creates wallets for parties user has rights to
    private async handlePartiesWithoutWallet(
        newParties: string[],
        networkId: string,
        rightsByParty: Map<string, PartyLevelRight[]>,
        participantNamespace: string
    ): Promise<Wallet[]> {
        this.requirePartyAllocator()
        return await Promise.all(
            newParties.map(async (partyId) => {
                const [hint, namespace] = partyId.split('::')

                const resolvedSigningProvider =
                    await this.resolveSigningProvider(
                        namespace,
                        participantNamespace
                    )

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
                    userId: this.authContext.userId,
                    rights:
                        rightsByParty.get(partyId) ??
                        WalletSyncService.EMPTY_RIGHTS,
                    ...(!isMatched && {
                        reason: WALLET_DISABLED_REASON.NO_SIGNING_PROVIDER_MATCHED,
                    }),
                }

                this.logger.info({ wallet }, 'Wallet sync result')
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
            // Absent from the snapshot means the user has no rights for that party.
            // Wallet rights will be set to empty for both syncRights and syncWallets, but status/disabled are updated only by syncWallets.
            const nextRights = [
                ...(rightsByParty.get(wallet.partyId) ??
                    WalletSyncService.EMPTY_RIGHTS),
            ]
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

    private requirePartyAllocator(): PartyAllocationService {
        if (!this.partyAllocator) {
            throw new Error(
                'Party allocation service is required to sync wallets'
            )
        }
        return this.partyAllocator
    }

    private async storeRights(snapshot: RightsSnapshot): Promise<Wallet[]> {
        const network = await this.store.getCurrentNetwork()
        await this.store.setUserRights(network.id, [
            ...(snapshot.rightsByUser.get(this.authContext.userId) ??
                new Set<UserLevelRight>()),
        ])
        const existingAllocatedWallets = (await this.store.getWallets()).filter(
            (wallet) => wallet.status === 'allocated'
        )
        return this.handleRightsUpdates(
            existingAllocatedWallets,
            snapshot.rightsByParty
        )
    }

    async syncRights(): Promise<Wallet[]> {
        this.logger.info('Starting rights sync...')
        try {
            const updated = await this.storeRights(
                await this.getRightsSnapshot()
            )
            this.logger.info(
                { updated: updated.map((wallet) => wallet.partyId) },
                'Rights sync completed.'
            )
            return updated
        } catch (err) {
            this.logger.error({ err }, 'Rights sync failed.')
            throw err
        }
    }

    async syncWallets(): Promise<SyncWalletsResult> {
        this.logger.info('Starting wallet sync...')
        try {
            this.requirePartyAllocator()
            const participantNamespace = await this.getParticipantNamespace()
            const network = await this.store.getCurrentNetwork()
            this.logger.info({ network }, 'Current network')

            const snapshot = await this.getRightsSnapshot()
            const rightsUpdatedWallets = await this.storeRights(snapshot)

            const { rightsByParty } = snapshot
            const partiesWithRights = Array.from(rightsByParty.keys())

            const existingWallets = await this.store.getWallets()
            this.logger.info({ existingWallets }, 'Existing wallets')
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

            const { updatedToInitialized, updatedToDisabled } =
                await this.handleWalletsWithoutParty(
                    existingAllocatedWallets,
                    new Set(partiesWithRights)
                )

            this.logger.info(
                {
                    newParties,
                    updatedToInitialized: updatedToInitialized.map(
                        (w) => w.partyId
                    ),
                    updatedToDisabled: updatedToDisabled.map((w) => w.partyId),
                },
                'Wallets without parties'
            )

            const newParticipantWallets = await this.handlePartiesWithoutWallet(
                newParties,
                network.id,
                rightsByParty,
                participantNamespace
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
                await this.store.setPrimaryWallet(allocatedWallets[0].partyId)
                this.logger.info(
                    `Set ${allocatedWallets[0].partyId} as primary wallet in network ${network.id}`
                )
            }

            const newWallets = newParticipantWallets
            // This assures wallet is not returned twice in updated if it had both rights change and status or disabled change.
            // status/disabled updated wallets taking precedence over rights updated assure most recent wallet data in response.
            const nonRightsUpdatesPartyIds = new Set([
                ...updatedToInitialized.map((wallet) => wallet.partyId),
                ...updatedToDisabled.map((wallet) => wallet.partyId),
            ])
            const rightsOnly = rightsUpdatedWallets.filter(
                (wallet) => !nonRightsUpdatesPartyIds.has(wallet.partyId)
            )
            const updatedRaw = [...updatedToInitialized, ...rightsOnly]

            const added = newWallets.filter((wallet) => !wallet.disabled)
            const updated = updatedRaw.filter((wallet) => !wallet.disabled)
            const disabled = [
                ...newWallets.filter((wallet) => wallet.disabled),
                ...updatedRaw.filter((wallet) => wallet.disabled),
                ...updatedToDisabled,
            ]

            this.logger.info(
                {
                    added,
                    updated,
                    disabled,
                },
                'Wallet sync completed.'
            )

            return {
                added,
                updated,
                disabled,
            }
        } catch (err) {
            this.logger.error({ err }, 'Wallet sync failed.')
            throw err
        }
    }
}
