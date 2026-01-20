// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { UserId } from '@canton-network/core-wallet-auth'
import {
    SigningKey,
    SigningTransaction,
    SigningDriverConfig,
    SigningDriverStatus,
} from '@canton-network/core-signing-lib'
import { z } from 'zod'

interface MigrationTable {
    name: string
    executedAt: string
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
    signedAt: string | null
}

export interface SigningDriverConfigTable {
    userId: UserId
    driverId: string
    config: string
}

export interface DB {
    migrations: MigrationTable
    signingKeys: SigningKeyTable
    signingTransactions: SigningTransactionTable
    signingDriverConfigs: SigningDriverConfigTable
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
        createdAt: key.createdAt,
        updatedAt: key.updatedAt,
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
        createdAt: table.createdAt,
        updatedAt: table.updatedAt,
        ...(table.metadata
            ? {
                  metadata:
                      typeof table.metadata === 'string'
                          ? JSON.parse(table.metadata)
                          : table.metadata,
              }
            : {}),
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
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        signedAt: transaction.signedAt || null,
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
        ...(table.metadata
            ? {
                  metadata:
                      typeof table.metadata === 'string'
                          ? JSON.parse(table.metadata)
                          : table.metadata,
              }
            : {}),
        createdAt: table.createdAt,
        updatedAt: table.updatedAt,
        ...(table.signedAt ? { signedAt: table.signedAt } : {}),
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
        config:
            typeof table.config === 'string'
                ? JSON.parse(table.config)
                : table.config,
    }
}

export const storeConfigSchema = z.object({
    connection: z.discriminatedUnion('type', [
        z.object({
            type: z.literal('memory'),
        }),
        z.object({
            type: z.literal('sqlite'),
            database: z.string(),
        }),
        z.object({
            type: z.literal('postgres'),
            host: z.string(),
            port: z.number(),
            user: z.string(),
            password: z.string(),
            database: z.string(),
        }),
    ]),
})

export type StoreConfig = z.infer<typeof storeConfigSchema>
