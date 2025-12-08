// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { authSchema, Idp, UserId } from '@canton-network/core-wallet-auth'
import {
    Wallet,
    Transaction,
    Session,
    Network,
    WalletStatus,
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
    verified: number | undefined
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
}

interface TransactionTable {
    status: string
    commandId: string
    preparedTransaction: string
    preparedTransactionHash: string
    payload: string | undefined
    userId: UserId
    createdAt: string | null
    signedAt: string | null
}

interface SessionTable extends Session {
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
        auth: authSchema.parse(JSON.parse(table.auth)),
        adminAuth: table.adminAuth
            ? authSchema.parse(JSON.parse(table.adminAuth))
            : undefined,
        verified:
            table.verified !== undefined ? table.verified === 1 : undefined,
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
        verified:
            network.verified !== undefined
                ? network.verified
                    ? 1
                    : 0
                : undefined,
    }
}

export const fromWallet = (wallet: Wallet, userId: UserId): WalletTable => {
    return {
        ...wallet,
        primary: wallet.primary ? 1 : 0,
        userId: userId,
    }
}

export const toWalletStatus = (status?: string): WalletStatus => {
    if (status === 'allocated') return 'allocated'
    return 'initialized'
}

export const toWallet = (table: WalletTable): Wallet => {
    return {
        ...table,
        primary: table.primary === 1,
        status: toWalletStatus(table.status),
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
        userId: userId,
        createdAt: transaction.createdAt?.toISOString() || null,
        signedAt: transaction.signedAt?.toISOString() || null,
    }
}

export const toTransaction = (table: TransactionTable): Transaction => {
    const result: Transaction = {
        commandId: table.commandId,
        status: table.status as 'pending' | 'signed' | 'executed' | 'failed',
        preparedTransaction: table.preparedTransaction,
        preparedTransactionHash: table.preparedTransactionHash,
        payload: table.payload ? JSON.parse(table.payload) : undefined,
    }

    if (table.createdAt) {
        result.createdAt = new Date(table.createdAt)
    }

    if (table.signedAt) {
        result.signedAt = new Date(table.signedAt)
    }

    return result
}
