// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { authSchema, Idp, UserId } from '@canton-network/core-wallet-auth'
import {
    Wallet,
    Transaction,
    Session,
    Network,
    WalletStatus,
    UpdateWallet,
    PartyLevelRight,
} from '@canton-network/core-wallet-store'

interface MigrationTable {
    name: string
    executedAt: string
}

interface IdpTable {
    id: string
    type: 'oauth' | 'self_signed'
    issuer: string
    configUrl: string | undefined
}

interface NetworkTable {
    id: string
    name: string
    synchronizerId: string | null // retrieved at runtime if null
    description: string
    ledgerApiBaseUrl: string
    identityProviderId: string
    userId: UserId | undefined // global if undefined

    auth: string // json stringified
    adminAuth: string | undefined // json stringified
}

interface WalletTable {
    primary: number
    partyId: string
    hint: string
    publicKey: string
    namespace: string
    networkId: string
    signingProviderId: string
    userId: UserId
    externalTxId?: string
    topologyTransactions?: string
    status?: string
    disabled: number
    reason?: string
    rightsActAs: number
    rightsReadAs: number
    rightsExecuteAs: number
}
interface UpdateWalletProperties {
    primary?: number
    externalTxId?: string
    topologyTransactions?: string
    status?: string
    disabled?: number
    reason?: string
    rightsActAs?: number
    rightsReadAs?: number
    rightsExecuteAs?: number
}

interface TransactionTable {
    status: string
    commandId: string
    preparedTransaction: string
    preparedTransactionHash: string
    payload: string | undefined
    origin: string | null
    userId: UserId
    createdAt: string | null
    signedAt: string | null
    externalTxId: string | null
}

interface SessionTable extends Session {
    id: string
    userId: UserId
}

export interface DB {
    migrations: MigrationTable
    idps: IdpTable
    networks: NetworkTable
    wallets: WalletTable
    transactions: TransactionTable
    sessions: SessionTable
}

export const toIdp = (table: IdpTable): Idp => {
    switch (table.type) {
        case 'oauth': {
            if (!table.configUrl) {
                throw new Error(`Missing configUrl for oauth IdP: ${table.id}`)
            }

            return {
                id: table.id,
                type: table.type,
                issuer: table.issuer,
                configUrl: table.configUrl,
            }
        }
        case 'self_signed':
            return {
                id: table.id,
                type: table.type,
                issuer: table.issuer,
            }
    }
}

export const fromIdp = (idp: Idp): IdpTable => {
    switch (idp.type) {
        case 'oauth':
            return {
                id: idp.id,
                type: idp.type,
                issuer: idp.issuer,
                configUrl: idp.configUrl,
            }
        case 'self_signed':
            return {
                id: idp.id,
                type: idp.type,
                issuer: idp.issuer,
                configUrl: undefined,
            }
    }
}

export const toNetwork = (table: NetworkTable): Network => {
    return {
        name: table.name,
        id: table.id,
        synchronizerId: table.synchronizerId ?? undefined,
        identityProviderId: table.identityProviderId,
        description: table.description,
        ledgerApi: {
            baseUrl: table.ledgerApiBaseUrl,
        },
        auth: authSchema.parse(
            typeof table.auth === 'string' ? JSON.parse(table.auth) : table.auth
        ),
        adminAuth: table.adminAuth
            ? authSchema.parse(
                  typeof table.adminAuth === 'string'
                      ? JSON.parse(table.adminAuth)
                      : table.adminAuth
              )
            : undefined,
    }
}

export const fromNetwork = (
    network: Network,
    userId?: UserId
): NetworkTable => {
    return {
        name: network.name,
        id: network.id,
        synchronizerId: network.synchronizerId ?? null,
        description: network.description,
        ledgerApiBaseUrl: network.ledgerApi.baseUrl,
        userId: userId,
        identityProviderId: network.identityProviderId,
        auth: JSON.stringify(network.auth),
        adminAuth: network.adminAuth
            ? JSON.stringify(network.adminAuth)
            : undefined,
    }
}

export const fromWallet = (wallet: Wallet, userId: UserId): WalletTable => {
    const { externalTxId, topologyTransactions, ...rest } = wallet
    return {
        ...rest,
        primary: wallet.primary ? 1 : 0,
        userId: userId,
        disabled: wallet.disabled !== undefined && wallet.disabled ? 1 : 0,
        rightsActAs: wallet.rights?.includes(PartyLevelRight.CanActAs) ? 1 : 0,
        rightsReadAs: wallet.rights?.includes(PartyLevelRight.CanReadAs)
            ? 1
            : 0,
        rightsExecuteAs: wallet.rights?.includes(PartyLevelRight.CanExecuteAs)
            ? 1
            : 0,
        ...(wallet.reason !== undefined && { reason: wallet.reason }),
        ...(externalTxId && externalTxId !== '' && { externalTxId }),
        ...(topologyTransactions &&
            topologyTransactions !== '' && { topologyTransactions }),
    }
}

// only update fields that are explicitly provided to prevent data loss
export const toWalletUpdateProperties = (
    params: UpdateWallet
): UpdateWalletProperties => {
    const {
        status,
        externalTxId,
        topologyTransactions,
        disabled,
        reason,
        primary,
        rights,
    } = params
    return {
        ...(status !== undefined && { status }),
        ...(externalTxId !== undefined && { externalTxId }),
        ...(topologyTransactions !== undefined && { topologyTransactions }),
        ...(primary !== undefined && { primary: primary ? 1 : 0 }),
        ...(disabled !== undefined && { disabled: disabled ? 1 : 0 }),
        ...(reason !== undefined && { reason }),
        ...(rights !== undefined && {
            rightsActAs: rights.includes(PartyLevelRight.CanActAs) ? 1 : 0,
            rightsReadAs: rights.includes(PartyLevelRight.CanReadAs) ? 1 : 0,
            rightsExecuteAs: rights.includes(PartyLevelRight.CanExecuteAs)
                ? 1
                : 0,
        }),
    }
}

export const toWalletStatus = (status?: string): WalletStatus => {
    if (status === 'allocated') return 'allocated'
    if (status === 'removed') return 'removed'
    return 'initialized'
}

export const toWallet = (table: WalletTable): Wallet => {
    return {
        primary: Boolean(table.primary),
        status: toWalletStatus(table.status),
        partyId: table.partyId,
        hint: table.hint,
        publicKey: table.publicKey,
        namespace: table.namespace,
        networkId: table.networkId,
        signingProviderId: table.signingProviderId,
        disabled: table.disabled === 1,
        ...(table.externalTxId !== undefined && {
            externalTxId: table.externalTxId,
        }),
        ...(table.topologyTransactions !== undefined && {
            topologyTransactions: table.topologyTransactions,
        }),
        ...(table.reason !== undefined && {
            reason: table.reason,
        }),
        ...((table.rightsActAs === 1 ||
            table.rightsReadAs === 1 ||
            table.rightsExecuteAs === 1) && {
            rights: [
                ...(table.rightsActAs === 1 ? [PartyLevelRight.CanActAs] : []),
                ...(table.rightsReadAs === 1
                    ? [PartyLevelRight.CanReadAs]
                    : []),
                ...(table.rightsExecuteAs === 1
                    ? [PartyLevelRight.CanExecuteAs]
                    : []),
            ],
        }),
    }
}

export const fromTransaction = (
    transaction: Transaction,
    userId: UserId
): TransactionTable => {
    return {
        ...transaction,
        payload: transaction.payload
            ? JSON.stringify(transaction.payload)
            : undefined,
        origin: transaction.origin || null,
        userId: userId,
        createdAt: transaction.createdAt?.toISOString() || null,
        signedAt: transaction.signedAt?.toISOString() || null,
        externalTxId: transaction.externalTxId ?? null,
    }
}

export const toTransaction = (table: TransactionTable): Transaction => {
    const result: Transaction = {
        commandId: table.commandId,
        status: table.status as 'pending' | 'signed' | 'executed' | 'failed',
        preparedTransaction: table.preparedTransaction,
        preparedTransactionHash: table.preparedTransactionHash,
        payload: table.payload ? JSON.parse(table.payload) : undefined,
        origin: table.origin || null,
    }

    if (table.createdAt) {
        result.createdAt = new Date(table.createdAt)
    }

    if (table.signedAt) {
        result.signedAt = new Date(table.signedAt)
    }

    if (table.externalTxId) {
        result.externalTxId = table.externalTxId
    }

    return result
}
