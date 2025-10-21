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

export interface DB {
    migrations: MigrationTable
    idps: IdpTable
    networks: NetworkTable
    wallets: WalletTable
    transactions: TransactionTable
    sessions: SessionTable
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
