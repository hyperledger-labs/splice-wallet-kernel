// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { UserId } from '@canton-network/core-wallet-auth'
import {
    Wallet,
    Transaction,
    Session,
    Auth,
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
    identityProviderId: string
    type: string
    issuer: string
    configUrl: string
    audience: string
    tokenUrl: string
    grantType: string
    scope: string
    clientId: string
    clientSecret: string
    adminClientId: string
    adminClientSecret: string
}

interface NetworkTable {
    name: string
    chainId: string
    synchronizerId: string
    description: string
    ledgerApiBaseUrl: string
    userId: UserId | undefined // global if undefined
    identityProviderId: string
}

interface WalletTable {
    primary: number
    partyId: string
    hint: string
    publicKey: string
    namespace: string
    chainId: string
    signingProviderId: string
    userId: UserId
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

export const toAuth = (table: IdpTable): Auth => {
    switch (table.type) {
        case 'password':
            return {
                identityProviderId: table.identityProviderId,
                type: table.type,
                issuer: table.issuer,
                configUrl: table.configUrl,
                audience: table.audience,
                tokenUrl: table.tokenUrl || '',
                grantType: table.grantType || '',
                scope: table.scope,
                clientId: table.clientId,
                admin: {
                    clientId: table.adminClientId,
                    clientSecret: table.adminClientSecret,
                },
            }
        case 'implicit':
            return {
                identityProviderId: table.identityProviderId,
                type: table.type,
                issuer: table.issuer,
                configUrl: table.configUrl,
                audience: table.audience,
                scope: table.scope,
                clientId: table.clientId,
                admin: {
                    clientId: table.adminClientId,
                    clientSecret: table.adminClientSecret,
                },
            }
        case 'client_credentials':
            return {
                identityProviderId: table.identityProviderId,
                type: table.type,
                issuer: table.issuer,
                configUrl: table.configUrl,
                audience: table.audience,
                scope: table.scope,
                clientId: table.clientId,
                clientSecret: table.clientSecret,
                admin: {
                    clientId: table.adminClientId,
                    clientSecret: table.adminClientSecret,
                },
            }
        default:
            throw new Error(`Unknown auth type: ${table.type}`)
    }
}

export const fromAuth = (auth: Auth): IdpTable => {
    switch (auth.type) {
        case 'password':
            return {
                identityProviderId: auth.identityProviderId,
                type: auth.type,
                issuer: auth.issuer,
                configUrl: auth.configUrl,
                audience: auth.audience,
                tokenUrl: auth.tokenUrl,
                grantType: auth.grantType,
                scope: auth.scope,
                clientId: auth.clientId,
                clientSecret: '',
                adminClientId: auth.admin?.clientId || '',
                adminClientSecret: auth.admin?.clientSecret || '',
            }
        case 'implicit':
            return {
                identityProviderId: auth.identityProviderId,
                type: auth.type,
                issuer: auth.issuer,
                configUrl: auth.configUrl,
                audience: auth.audience,
                tokenUrl: '',
                grantType: '',
                scope: auth.scope,
                clientId: auth.clientId,
                clientSecret: '',
                adminClientId: auth.admin?.clientId || '',
                adminClientSecret: auth.admin?.clientSecret || '',
            }
        case 'client_credentials':
            return {
                identityProviderId: auth.identityProviderId,
                type: auth.type,
                issuer: auth.issuer,
                configUrl: auth.configUrl,
                audience: auth.audience,
                tokenUrl: '',
                grantType: '',
                scope: auth.scope,
                clientId: auth.clientId,
                clientSecret: auth.clientSecret,
                adminClientId: auth.admin?.clientId || '',
                adminClientSecret: auth.admin?.clientSecret || '',
            }
        default:
            throw new Error(`Unknown auth type`)
    }
}

export const toNetwork = (
    table: NetworkTable,
    authTable?: IdpTable
): Network => {
    if (!authTable) {
        throw new Error(`Missing auth table for network: ${table.name}`)
    }
    return {
        name: table.name,
        chainId: table.chainId,
        synchronizerId: table.synchronizerId,
        description: table.description,
        ledgerApi: {
            baseUrl: table.ledgerApiBaseUrl,
        },
        auth: toAuth(authTable),
    }
}

export const fromNetwork = (
    network: Network,
    userId?: UserId
): NetworkTable => {
    return {
        name: network.name,
        chainId: network.chainId,
        synchronizerId: network.synchronizerId,
        description: network.description,
        ledgerApiBaseUrl: network.ledgerApi.baseUrl,
        userId: userId,
        identityProviderId: network.auth.identityProviderId,
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
