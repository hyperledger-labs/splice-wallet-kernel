// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    authSchema,
    type Idp,
    type UserId,
} from '@canton-network/core-wallet-auth'
import {
    type Wallet,
    type Transaction,
    type Session,
    type Network,
    type WalletStatus,
    type UpdateWallet,
    PartyLevelRight,
    UserLevelRight,
    type MessageRaw,
    type ApiKey,
} from '@canton-network/core-wallet-store'

interface MigrationTable {
    name: string
    executedAt: string
}

interface IdpTable {
    id: string
    type: 'oauth' | 'self_signed' | 'self_issued'
    issuer: string | null
    configUrl: string | null
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
    serviceAccountAuth: string | undefined // json stringified
}

/**
 * Wallet table schema
 * Primary key on (partyId, networkId, userId)
 * Unique constraint on (networkId, userId) for primary wallet per network per user
 */
interface WalletTable {
    primary: number
    partyId: string
    hint: string
    publicKey: string
    namespace: string
    networkId: string
    signingProviderId: string
    userId: UserId
    externalTxId: string | null
    topologyTransactions: string | null
    status: string | null
    disabled: number
    reason: string | null
    isAuthParty: number
}
interface UpdateWalletProperties {
    primary?: number
    externalTxId?: string | null
    topologyTransactions?: string | null
    status?: string | null
    disabled?: number
    reason?: string | null
    isAuthParty?: number
}

interface UserPartyRightTable {
    userId: UserId
    networkId: string
    partyId: string
    right: PartyLevelRight
}

interface UserRightTable {
    userId: UserId
    networkId: string
    right: UserLevelRight
}

interface TransactionTable {
    id: string
    status: string
    commandId: string
    networkId: string
    preparedTransaction: string
    preparedTransactionHash: string
    payload: string | undefined
    origin: string | null
    userId: UserId
    createdAt: string | null
    signedAt: string | null
    externalTxId: string | null
    failureReason: string | null
}

interface MessageRawTable {
    id: string
    status: string
    partyId: string
    publicKey: string
    message: string
    origin: string | null
    userId: UserId
    networkId: string
    createdAt: string
    signedAt: string | null
    signature: string | null
    externalTxId: string | null
    failureReason: string | null
}

interface SessionTable {
    id: string
    origin: string
    network: string
    accessToken: string | null
    userId: UserId
}

interface ApiKeysTable {
    id: string
    digest: string
    name: string
    userId: UserId
    email: string | null
    networkId: string
    createdAt: string
    lastUsedAt: string | null
}

export interface DB {
    migrations: MigrationTable
    idps: IdpTable
    networks: NetworkTable
    wallets: WalletTable
    userPartyRights: UserPartyRightTable
    userRights: UserRightTable
    transactions: TransactionTable
    messagesRaw: MessageRawTable
    sessions: SessionTable
    apiKeys: ApiKeysTable
}

export const toIdp = (table: IdpTable): Idp => {
    switch (table.type) {
        case 'oauth': {
            if (!table.configUrl) {
                throw new Error(`Missing configUrl for oauth IdP: ${table.id}`)
            }
            if (table.issuer === null) {
                throw new Error(`Missing issuer for oauth IdP: ${table.id}`)
            }

            return {
                id: table.id,
                type: table.type,
                issuer: table.issuer,
                configUrl: table.configUrl,
            }
        }
        case 'self_signed':
            if (table.issuer === null) {
                throw new Error(
                    `Missing issuer for self_signed IdP: ${table.id}`
                )
            }
            return {
                id: table.id,
                type: table.type,
                issuer: table.issuer,
            }
        case 'self_issued':
            return {
                id: table.id,
                type: table.type,
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
                configUrl: null,
            }
        case 'self_issued':
            return {
                id: idp.id,
                type: idp.type,
                issuer: null,
                configUrl: null,
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
        serviceAccountAuth: table.serviceAccountAuth
            ? authSchema.parse(
                  typeof table.serviceAccountAuth === 'string'
                      ? JSON.parse(table.serviceAccountAuth)
                      : table.serviceAccountAuth
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
        serviceAccountAuth: network.serviceAccountAuth
            ? JSON.stringify(network.serviceAccountAuth)
            : undefined,
    }
}

export const toSession = (table: SessionTable): Session => {
    return {
        id: table.id,
        network: table.network,
        origin: table.origin,
        ...(table.accessToken ? { accessToken: table.accessToken } : {}),
        userId: table.userId,
    }
}

export const fromWallet = (wallet: Wallet, userId: UserId): WalletTable => {
    const { externalTxId, topologyTransactions, rights, isAuthParty, ...rest } =
        wallet
    void rights
    return {
        ...rest,
        primary: wallet.primary ? 1 : 0,
        userId: userId,
        disabled: wallet.disabled !== undefined && wallet.disabled ? 1 : 0,
        isAuthParty: isAuthParty ? 1 : 0,
        reason: wallet.reason ?? null,
        externalTxId: externalTxId && externalTxId !== '' ? externalTxId : null,
        topologyTransactions:
            topologyTransactions && topologyTransactions !== ''
                ? topologyTransactions
                : null,
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
        signingProviderId,
        publicKey,
        namespace,
        isAuthParty,
    } = params
    return {
        ...(status !== undefined && { status }),
        ...(externalTxId !== undefined && { externalTxId }),
        ...(topologyTransactions !== undefined && { topologyTransactions }),
        ...(primary !== undefined && { primary: primary ? 1 : 0 }),
        ...(disabled !== undefined && { disabled: disabled ? 1 : 0 }),
        ...(reason !== undefined && { reason }),
        ...(signingProviderId !== undefined && { signingProviderId }),
        ...(publicKey !== undefined && { publicKey }),
        ...(namespace !== undefined && { namespace }),
        ...(isAuthParty !== undefined && { isAuthParty: isAuthParty ? 1 : 0 }),
    }
}

export const toWalletStatus = (status?: string | null): WalletStatus => {
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
        isAuthParty: Boolean(table.isAuthParty),
        userId: table.userId,
        ...(table.externalTxId !== null && {
            externalTxId: table.externalTxId,
        }),
        ...(table.topologyTransactions !== null && {
            topologyTransactions: table.topologyTransactions,
        }),
        ...(table.reason !== null && {
            reason: table.reason,
        }),
        rights: [],
    }
}

export const fromPartyRight = (right: string): PartyLevelRight | undefined => {
    if (Object.values(PartyLevelRight).includes(right as PartyLevelRight)) {
        return right as PartyLevelRight
    }
    return undefined
}

export const fromUserRight = (right: string): UserLevelRight | undefined => {
    if (Object.values(UserLevelRight).includes(right as UserLevelRight)) {
        return right as UserLevelRight
    }
    return undefined
}

export const fromTransaction = (
    transaction: Transaction,
    userId: UserId,
    networkId: string
): TransactionTable => {
    return {
        ...transaction,
        networkId,
        payload: transaction.payload
            ? JSON.stringify(transaction.payload)
            : undefined,
        origin: transaction.origin || null,
        userId: userId,
        createdAt: transaction.createdAt?.toISOString() || null,
        signedAt: transaction.signedAt?.toISOString() || null,
        externalTxId: transaction.externalTxId ?? null,
        failureReason: transaction.failureReason || null,
    }
}

export const toTransaction = (table: TransactionTable): Transaction => {
    const result: Transaction = {
        id: table.id,
        commandId: table.commandId,
        status: table.status as 'pending' | 'signed' | 'executed' | 'failed',
        preparedTransaction: table.preparedTransaction,
        preparedTransactionHash: table.preparedTransactionHash,
        payload: table.payload ? JSON.parse(table.payload) : undefined,
        origin: table.origin || null,
        userId: table.userId,
        networkId: table.networkId,
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

    if (table.failureReason) {
        result.failureReason = table.failureReason
    }

    return result
}

export const fromMessageRaw = (
    message: MessageRaw,
    userId: UserId,
    networkId: string
): MessageRawTable => {
    if (message.userId !== userId) {
        throw new Error(
            `MessageRaw userId mismatch: expected ${userId}, got ${message.userId}`
        )
    }
    return {
        id: message.id,
        status: message.status,
        userId: message.userId,
        partyId: message.partyId,
        publicKey: message.publicKey,
        message: message.message,
        origin: message.origin || null,
        networkId,
        createdAt: message.createdAt.toISOString(),
        signedAt: message.signedAt?.toISOString() || null,
        signature: message.signature ?? null,
        externalTxId: message.externalTxId ?? null,
        failureReason: message.failureReason ?? null,
    }
}

export const toMessageRaw = (table: MessageRawTable): MessageRaw => {
    const result: MessageRaw = {
        id: table.id,
        status: table.status as MessageRaw['status'],
        userId: table.userId,
        partyId: table.partyId,
        publicKey: table.publicKey,
        message: table.message,
        origin: table.origin || null,
        createdAt: new Date(table.createdAt),
    }

    if (table.signedAt) {
        result.signedAt = new Date(table.signedAt)
    }
    if (table.signature) {
        result.signature = table.signature
    }
    if (table.externalTxId) {
        result.externalTxId = table.externalTxId
    }
    if (table.failureReason) {
        result.failureReason = table.failureReason
    }

    return result
}

export const fromApiKey = (table: ApiKeysTable): ApiKey => {
    return {
        id: table.id,
        digest: table.digest,
        name: table.name,
        userId: table.userId,
        email: table.email,
        networkId: table.networkId,
        createdAt: new Date(table.createdAt),
        lastUsedAt: table.lastUsedAt ? new Date(table.lastUsedAt) : undefined,
    }
}

export const toApiKey = (apiKey: ApiKey): ApiKeysTable => {
    return {
        id: apiKey.id,
        digest: apiKey.digest,
        name: apiKey.name,
        userId: apiKey.userId,
        email: apiKey.email,
        networkId: apiKey.networkId,
        createdAt: apiKey.createdAt.toISOString(),
        lastUsedAt: apiKey.lastUsedAt ? apiKey.lastUsedAt.toISOString() : null,
    }
}
