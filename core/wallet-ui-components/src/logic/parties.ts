// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Framework-agnostic logic for the parties pages. Nothing in here may import
// Lit, React or any CSS, so every UI shell can use it. Functions that talk to
// the user API take the client as an argument, and functions that produce
// messages return a ToastDescriptor for the caller to display.

import type UserApiClient from '@canton-network/core-wallet-user-rpc-client'
import type {
    CreateWalletParams,
    Key,
    ListWalletsParams,
    Session,
    SyncWalletsResult,
    Wallet,
    WalletStatus,
} from '@canton-network/core-wallet-user-rpc-client'

export type ToastType = 'info' | 'success' | 'error'

export interface ToastDescriptor {
    title: string
    message: string
    type: ToastType
}

/** The subset of the user API client the helpers below need */
export type PartiesClient = Pick<UserApiClient, 'request'>

/**
 * Handed from the add and edit pages to the parties page in the
 * `createPartyStatus` query parameter, which then shows a toast.
 */
export enum WALLET_STATUS_CODE {
    WALLET_ALLOCATED = '1',
    WALLET_INITIALIZED = '2',
    WALLET_REMOVED = '3',
    WALLET_EDITED = '4',
}

export const PARTY_STATUS_PARAM = 'createPartyStatus'

const WALLET_STATUS_TO_CODE: Record<WalletStatus, WALLET_STATUS_CODE> = {
    allocated: WALLET_STATUS_CODE.WALLET_ALLOCATED,
    initialized: WALLET_STATUS_CODE.WALLET_INITIALIZED,
    removed: WALLET_STATUS_CODE.WALLET_REMOVED,
}

export function walletStatusToCode(status: WalletStatus): WALLET_STATUS_CODE {
    return WALLET_STATUS_TO_CODE[status]
}

/** The toast for a `createPartyStatus` value, or undefined for unknown values */
export function partyStatusToast(
    code: string | null | undefined
): ToastDescriptor | undefined {
    switch (code) {
        case WALLET_STATUS_CODE.WALLET_ALLOCATED:
            return {
                title: 'Party created',
                message: 'Your new party has been created successfully.',
                type: 'success',
            }
        case WALLET_STATUS_CODE.WALLET_INITIALIZED:
            return {
                title: 'Party creation pending',
                message:
                    'Complete the signing in your signing provider, then click Allocate to finish.',
                type: 'info',
            }
        case WALLET_STATUS_CODE.WALLET_REMOVED:
            return {
                title: 'Party creation rejected',
                message:
                    'Party creation failed because the signing transaction was unsuccessful.',
                type: 'error',
            }
        case WALLET_STATUS_CODE.WALLET_EDITED:
            return {
                title: 'Party edited',
                message: 'Your party has been edited successfully.',
                type: 'success',
            }
        default:
            return undefined
    }
}

/** The toast for the result of allocating a party that is already created */
export function allocationResultToast(
    status: WalletStatus
): ToastDescriptor | undefined {
    switch (status) {
        case 'removed':
            return {
                title: 'Party removed',
                message:
                    'Party was removed because the signing transaction was unsuccessful.',
                type: 'error',
            }
        case 'allocated':
            return {
                title: 'Party allocated',
                message: 'Party has been successfully allocated.',
                type: 'success',
            }
        case 'initialized':
            return {
                title: 'Transaction pending',
                message:
                    'The signing transaction is still pending. Please approve it in selected signing provider, then try again.',
                type: 'info',
            }
        default:
            return undefined
    }
}

export function walletSyncResultToast(
    result: Pick<SyncWalletsResult, 'added' | 'updated' | 'disabled'>
): ToastDescriptor {
    return {
        title: 'Wallet Sync Complete',
        message: `Added: ${result.added.length}, Updated: ${result.updated.length}, Disabled: ${result.disabled.length}.`,
        type: 'success',
    }
}

/** Allocated wallets are shown as verified, all others as unverified */
export function partitionWallets(wallets: readonly Wallet[] | undefined): {
    verifiedWallets: Wallet[]
    unverifiedWallets: Wallet[]
} {
    const verifiedWallets: Wallet[] = []
    const unverifiedWallets: Wallet[] = []
    for (const wallet of wallets ?? []) {
        if (wallet.status === 'allocated') {
            verifiedWallets.push(wallet)
        } else {
            unverifiedWallets.push(wallet)
        }
    }
    return { verifiedWallets, unverifiedWallets }
}

/**
 * Wallets of the participant's own signing provider can't change provider.
 * `fixedSigningProviderId` is `SigningProvider.PARTICIPANT`, passed in so this
 * module doesn't depend on the signing library.
 */
export function isWalletEditable(
    wallet: Pick<Wallet, 'signingProviderId'>,
    fixedSigningProviderId: string
): boolean {
    return wallet.signingProviderId !== fixedSigningProviderId
}

export function sortKeysByName<K extends Pick<Key, 'name'>>(keys: K[]): K[] {
    return [...keys].sort((a, b) => a.name.localeCompare(b.name))
}

export function buildCreateWalletParams(input: {
    primary: boolean
    partyHint: string
    signingProviderId: string
    keyName?: string
}): CreateWalletParams {
    return {
        primary: input.primary,
        partyHint: input.partyHint,
        signingProviderId: input.signingProviderId,
        ...(input.keyName && { keyName: input.keyName }),
    }
}

/**
 * The network to list wallets for: the one of the current session, otherwise
 * the stored one.
 */
export function resolveNetworkId(
    sessions: readonly Pick<Session, 'network'>[] | undefined,
    storedNetworkId?: string | null
): string | undefined {
    return sessions?.[0]?.network?.id || storedNetworkId || undefined
}

export function buildListWalletsParams(
    networkId: string | undefined
): ListWalletsParams {
    return networkId ? { filter: { networkIds: [networkId] } } : {}
}

/**
 * Lists the wallets of the current network. A failing `listSessions` is
 * treated as having no session.
 */
export async function loadWallets(
    client: PartiesClient,
    storedNetworkId?: string | null
): Promise<Wallet[]> {
    const sessions = await client
        .request({ method: 'listSessions' })
        .catch(() => ({ sessions: [] }))
    const networkId = resolveNetworkId(sessions?.sessions, storedNetworkId)
    const wallets = await client.request({
        method: 'listWallets',
        params: buildListWalletsParams(networkId),
    })
    return wallets || []
}

/** Whether the participant has wallets that aren't synced yet. Errors count as yes. */
export async function isWalletSyncNeeded(
    client: PartiesClient
): Promise<boolean> {
    try {
        const result = await client.request({ method: 'isWalletSyncNeeded' })
        return result?.walletSyncNeeded === true
    } catch {
        return true
    }
}

export function syncWallets(client: PartiesClient): Promise<SyncWalletsResult> {
    return client.request({ method: 'syncWallets' })
}
