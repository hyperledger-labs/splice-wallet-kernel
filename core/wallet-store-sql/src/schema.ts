// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { authSchema, Idp, UserId } from '@canton-network/core-wallet-auth'
import {
    Wallet,
    Transaction,
    Session,
    Network,
} from '@canton-network/core-wallet-store'
import {
    SigningKey,
    SigningTransaction,
    SigningDriverConfig,
    SigningDriverStatus,
} from '@canton-network/core-signing-lib'

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
    synchronizerId: string
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
}

interface TransactionTable {
    status: string
    commandId: string
    preparedTransaction: string
    preparedTransactionHash: string
    payload: string | undefined
    userId: UserId
}

interface SessionTable extends Session {
    userId: UserId
}

export interface SigningKeyTable {
    id: string
    userId: UserId
    name: string
    publicKey: string
    privateKey: string | null
    metadata: string | null
    createdAt: string
    updatedAt: string
}

export interface SigningTransactionTable {
    id: string
    userId: UserId
    hash: string
    signature: string | null
    publicKey: string
    status: string
    metadata: string | null
    createdAt: string
    updatedAt: string
}

export interface SigningDriverConfigTable {
    userId: UserId
    driverId: string
    config: string
}

export interface DB {
    migrations: MigrationTable
    idps: IdpTable
    networks: NetworkTable
    wallets: WalletTable
    transactions: TransactionTable
    sessions: SessionTable
    signingKeys: SigningKeyTable
    signingTransactions: SigningTransactionTable
    signingDriverConfigs: SigningDriverConfigTable
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
        synchronizerId: table.synchronizerId,
        identityProviderId: table.identityProviderId,
        description: table.description,
        ledgerApi: {
            baseUrl: table.ledgerApiBaseUrl,
        },
        auth: authSchema.parse(JSON.parse(table.auth)),
        adminAuth: table.adminAuth
            ? authSchema.parse(JSON.parse(table.adminAuth))
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
        synchronizerId: network.synchronizerId,
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
    return {
        ...wallet,
        primary: wallet.primary ? 1 : 0,
        userId: userId,
    }
}

export const toWallet = (table: WalletTable): Wallet => {
    return {
        ...table,
        primary: table.primary === 1,
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
    }
}

export const toTransaction = (table: TransactionTable): Transaction => {
    return {
        ...table,
        status: table.status as 'pending' | 'signed' | 'executed' | 'failed',
        payload: table.payload ? JSON.parse(table.payload) : undefined,
    }
}

// Signing driver conversion functions

export const fromSigningKey = (
    key: SigningKey,
    userId: UserId,
    encrypt?: (data: string) => string
): SigningKeyTable => {
    return {
        id: key.id,
        userId: userId,
        name: key.name,
        publicKey: key.publicKey,
        privateKey: key.privateKey
            ? encrypt
                ? encrypt(key.privateKey)
                : key.privateKey
            : null,
        metadata: key.metadata ? JSON.stringify(key.metadata) : null,
        createdAt: key.createdAt.toISOString(),
        updatedAt: key.updatedAt.toISOString(),
    }
}

export const toSigningKey = (
    table: SigningKeyTable,
    decrypt?: (data: string) => string
): SigningKey => {
    return {
        id: table.id,
        name: table.name,
        publicKey: table.publicKey,
        ...(table.privateKey
            ? {
                  privateKey: decrypt
                      ? decrypt(table.privateKey)
                      : table.privateKey,
              }
            : {}),
        createdAt: new Date(table.createdAt),
        updatedAt: new Date(table.updatedAt),
        ...(table.metadata ? { metadata: JSON.parse(table.metadata) } : {}),
    }
}

export const fromSigningTransaction = (
    transaction: SigningTransaction,
    userId: UserId
): SigningTransactionTable => {
    return {
        id: transaction.id,
        userId: userId,
        hash: transaction.hash,
        signature: transaction.signature || null,
        publicKey: transaction.publicKey,
        status: transaction.status,
        metadata: transaction.metadata
            ? JSON.stringify(transaction.metadata)
            : null,
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString(),
    }
}

export const toSigningTransaction = (
    table: SigningTransactionTable
): SigningTransaction => {
    return {
        id: table.id,
        hash: table.hash,
        ...(table.signature ? { signature: table.signature } : {}),
        publicKey: table.publicKey,
        status: table.status as SigningDriverStatus,
        ...(table.metadata ? { metadata: JSON.parse(table.metadata) } : {}),
        createdAt: new Date(table.createdAt),
        updatedAt: new Date(table.updatedAt),
    }
}

export const fromSigningDriverConfig = (
    config: SigningDriverConfig,
    userId: UserId
): SigningDriverConfigTable => {
    return {
        userId: userId,
        driverId: config.driverId,
        config: JSON.stringify(config.config),
    }
}

export const toSigningDriverConfig = (
    table: SigningDriverConfigTable
): SigningDriverConfig => {
    return {
        driverId: table.driverId,
        config: JSON.parse(table.config),
    }
}
