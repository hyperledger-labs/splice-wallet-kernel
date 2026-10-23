// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { AuthContext, UserId } from '@canton-network/core-wallet-auth'
import type { Store, Wallet } from '@canton-network/core-wallet-store'
import {
    type Error as SigningProviderError,
    type Keys,
    type SigningDriverInterface,
    SigningProvider,
} from '@canton-network/core-signing-lib'
import type { Logger } from 'pino'
import type { PartyAllocationService } from '../party-allocation-service.js'
import type {
    KeyName,
    PartyHint,
    Primary,
} from '../../user-api/rpc-gen/typings.js'
import { ParticipantWalletAllocator } from './signing-providers/participant-wallet-allocator.js'
import { KernelWalletAllocator } from './signing-providers/kernel-wallet-allocator.js'
import { FireblocksWalletAllocator } from './signing-providers/fireblocks-wallet-allocator.js'
import { BlockdaemonWalletAllocator } from './signing-providers/blockdaemon-wallet-allocator.js'
import { DfnsWalletAllocator } from './signing-providers/dfns-wallet-allocator.js'
import { SecurosysWalletAllocator } from './signing-providers/securosys-wallet-allocator.js'
import { BitGoWalletAllocator } from './signing-providers/bitgo-wallet-allocator.js'

export interface WalletAllocator {
    createWallet(
        userId: UserId,
        email: string | undefined,
        partyHint: PartyHint,
        primary: Primary,
        vaultName?: KeyName
    ): Promise<Wallet>
    allocateParty(
        userId: UserId,
        email: string | undefined,
        existingWallet: Wallet
    ): Promise<void>
    getKeys(userId: UserId): Promise<Keys | null | void>
}

export function handleSigningProviderError<T extends object>(
    result: SigningProviderError | T
): T {
    if ('error' in result) {
        throw new Error(
            `Error from signing driver: ${result.error_description}`
        )
    }
    return result
}

export class WalletAllocationService {
    private readonly participantAllocator: ParticipantWalletAllocator
    private readonly kernelAllocator?: KernelWalletAllocator
    private readonly fireblocksAllocator?: FireblocksWalletAllocator
    private readonly blockdaemonAllocator?: BlockdaemonWalletAllocator
    private readonly dfnsAllocator?: DfnsWalletAllocator
    private readonly securosysAllocator?: SecurosysWalletAllocator
    private readonly bitgoAllocator?: BitGoWalletAllocator

    private getAllocator(
        signingProviderId: string
    ): WalletAllocator | undefined {
        switch (signingProviderId) {
            case SigningProvider.BLOCKDAEMON:
                return this.blockdaemonAllocator
            case SigningProvider.DFNS:
                return this.dfnsAllocator
            case SigningProvider.FIREBLOCKS:
                return this.fireblocksAllocator
            case SigningProvider.SECUROSYS:
                return this.securosysAllocator
            case SigningProvider.BITGO:
                return this.bitgoAllocator
            case SigningProvider.WALLET_KERNEL:
                return this.kernelAllocator
            case SigningProvider.PARTICIPANT:
            default:
                return this.participantAllocator
        }
    }

    constructor(
        store: Store,
        logger: Logger,
        partyAllocator: PartyAllocationService,
        signingDrivers: Partial<
            Record<SigningProvider, SigningDriverInterface>
        > = {}
    ) {
        this.participantAllocator = new ParticipantWalletAllocator(
            store,
            logger,
            partyAllocator
        )

        const kernelDriver = signingDrivers[SigningProvider.WALLET_KERNEL]
        if (kernelDriver) {
            this.kernelAllocator = new KernelWalletAllocator(
                store,
                logger,
                partyAllocator,
                kernelDriver
            )
        }

        const fireblocksDriver = signingDrivers[SigningProvider.FIREBLOCKS]
        if (fireblocksDriver) {
            this.fireblocksAllocator = new FireblocksWalletAllocator(
                store,
                logger,
                partyAllocator,
                fireblocksDriver
            )
        }

        const blockdaemonDriver = signingDrivers[SigningProvider.BLOCKDAEMON]
        if (blockdaemonDriver) {
            this.blockdaemonAllocator = new BlockdaemonWalletAllocator(
                store,
                logger,
                partyAllocator,
                blockdaemonDriver
            )
        }

        const dfnsDriver = signingDrivers[SigningProvider.DFNS]
        if (dfnsDriver) {
            this.dfnsAllocator = new DfnsWalletAllocator(
                store,
                logger,
                partyAllocator,
                dfnsDriver
            )
        }

        const securosysDriver = signingDrivers[SigningProvider.SECUROSYS]
        if (securosysDriver) {
            this.securosysAllocator = new SecurosysWalletAllocator(
                store,
                logger,
                partyAllocator,
                securosysDriver
            )
        }

        const bitgoDriver = signingDrivers[SigningProvider.BITGO]
        if (bitgoDriver) {
            this.bitgoAllocator = new BitGoWalletAllocator(
                store,
                logger,
                partyAllocator,
                bitgoDriver
            )
        }
    }

    public async createWallet(
        authContext: AuthContext,
        partyHint: PartyHint,
        primary: Primary,
        signingProviderId: SigningProvider,
        keyName?: KeyName
    ): Promise<Wallet> {
        switch (signingProviderId) {
            case SigningProvider.PARTICIPANT:
                return this.participantAllocator.createWallet(
                    authContext.userId,
                    authContext.email,
                    partyHint,
                    primary
                )
            case SigningProvider.WALLET_KERNEL:
                if (!this.kernelAllocator) {
                    throw new Error(
                        'Wallet Gateway signing driver not available'
                    )
                }
                return this.kernelAllocator.createWallet(
                    authContext.userId,
                    authContext.email,
                    partyHint,
                    primary
                )
            case SigningProvider.FIREBLOCKS:
                if (!this.fireblocksAllocator) {
                    throw new Error('Fireblocks signing driver not available')
                }
                if (!keyName) {
                    throw new Error(
                        'keyName is required for creating a wallet with Fireblocks'
                    )
                }
                return this.fireblocksAllocator.createWallet(
                    authContext.userId,
                    authContext.email,
                    partyHint,
                    primary,
                    keyName
                )
            case SigningProvider.BLOCKDAEMON:
                if (!this.blockdaemonAllocator) {
                    throw new Error('Blockdaemon signing driver not available')
                }
                if (!authContext.email) {
                    throw new Error(
                        'Email is required for Blockdaemon wallet allocation'
                    )
                }
                return this.blockdaemonAllocator.createWallet(
                    authContext.userId,
                    authContext.email,
                    partyHint,
                    primary
                )
            case SigningProvider.DFNS:
                if (!this.dfnsAllocator) {
                    throw new Error('Dfns signing driver not available')
                }
                return this.dfnsAllocator.createWallet(
                    authContext.userId,
                    authContext.email,
                    partyHint,
                    primary
                )
            case SigningProvider.SECUROSYS:
                if (!this.securosysAllocator) {
                    throw new Error('Securosys signing driver not available')
                }
                return this.securosysAllocator.createWallet(
                    authContext.userId,
                    authContext.email,
                    partyHint,
                    primary
                )
            case SigningProvider.BITGO:
                if (!this.bitgoAllocator) {
                    throw new Error('BitGo signing driver not available')
                }
                return this.bitgoAllocator.createWallet(
                    authContext.userId,
                    authContext.email,
                    partyHint,
                    primary
                )
            default:
                throw new Error(
                    `Unsupported signing provider: ${String(signingProviderId)}`
                )
        }
    }

    public async allocateParty(
        authContext: AuthContext,
        existingWallet: Wallet,
        signingProviderId: SigningProvider
    ): Promise<void> {
        switch (signingProviderId) {
            case SigningProvider.PARTICIPANT:
                return this.participantAllocator.allocateParty(
                    authContext.userId,
                    authContext.email,
                    existingWallet
                )
            case SigningProvider.WALLET_KERNEL:
                if (!this.kernelAllocator) {
                    throw new Error(
                        'Wallet Gateway signing driver not available'
                    )
                }
                return this.kernelAllocator.allocateParty(
                    authContext.userId,
                    authContext.email,
                    existingWallet
                )
            case SigningProvider.FIREBLOCKS:
                if (!this.fireblocksAllocator) {
                    throw new Error('Fireblocks signing driver not available')
                }
                return this.fireblocksAllocator.allocateParty(
                    authContext.userId,
                    authContext.email,
                    existingWallet
                )
            case SigningProvider.BLOCKDAEMON:
                if (!this.blockdaemonAllocator) {
                    throw new Error('Blockdaemon signing driver not available')
                }
                if (!authContext.email) {
                    throw new Error(
                        'Email is required for Blockdaemon wallet allocation'
                    )
                }
                return this.blockdaemonAllocator.allocateParty(
                    authContext.userId,
                    authContext.email,
                    existingWallet
                )
            case SigningProvider.DFNS:
                if (!this.dfnsAllocator) {
                    throw new Error('Dfns signing driver not available')
                }
                return this.dfnsAllocator.allocateParty(
                    authContext.userId,
                    authContext.email,
                    existingWallet
                )
            case SigningProvider.SECUROSYS:
                if (!this.securosysAllocator) {
                    throw new Error('Securosys signing driver not available')
                }
                return this.securosysAllocator.allocateParty(
                    authContext.userId,
                    authContext.email,
                    existingWallet
                )
            case SigningProvider.BITGO:
                if (!this.bitgoAllocator) {
                    throw new Error('BitGo signing driver not available')
                }
                return this.bitgoAllocator.allocateParty(
                    authContext.userId,
                    authContext.email,
                    existingWallet
                )
            default:
                throw new Error(
                    `Unsupported signing provider: ${String(signingProviderId)}`
                )
        }
    }

    public async getKeys(
        authContext: AuthContext,
        signingProviderId: SigningProvider
    ) {
        const allocator = this.getAllocator(signingProviderId)
        if (!allocator) {
            throw new Error(
                `Could not find signing driver for ${signingProviderId}`
            )
        }
        return allocator.getKeys(authContext.userId)
    }
}
