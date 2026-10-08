// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type {
    SigningDriverConfig,
    SigningDriverStatus,
    SigningDriverStore,
    SigningKey,
    SigningTransaction,
} from '@canton-network/core-signing-lib'
import type { UserId } from '@canton-network/core-wallet-auth'
import {
    toSigningKey,
    fromSigningKey,
    toSigningTransaction,
    fromSigningTransaction,
    toSigningDriverConfig,
    fromSigningDriverConfig,
} from './schemas.js'
import {
    signingKeysItem,
    type SigningKeyRecord,
    signingTransactionsItem,
    type SigningTransactionRecord,
    signingDriverConfigItem,
} from './items.js'

// Every signing-transaction mutation reads and replaces the whole stored array.
// This module-level queue runs those mutations one at a time for every WxtStore
// in this JavaScript context, so concurrent writes cannot drop each other.
let signingTransactionsQueue: Promise<void> = Promise.resolve()

function updateSigningTransactions(
    update: (txs: SigningTransactionRecord[]) => SigningTransactionRecord[]
): Promise<void> {
    const mutation = signingTransactionsQueue.then(async () => {
        const item = signingTransactionsItem()
        await item.setValue(update(await item.getValue()))
    })
    // A failed mutation rejects for its caller only; later ones still run.
    signingTransactionsQueue = mutation.catch(() => undefined)
    return mutation
}

/* eslint-disable @typescript-eslint/no-unused-vars */
// this is required because the extension is single user, but we need to satisfy the SigningDriverStore interface

export class WxtStore implements SigningDriverStore {
    constructor(private userId: UserId) {}

    async getSigningKey(
        userId: string,
        keyId: string
    ): Promise<SigningKey | undefined> {
        const record = await signingKeysItem().getValue()
        const signingKey = record
            ? record.find((r) => r.id === keyId)
            : undefined

        return signingKey ? toSigningKey(signingKey) : undefined
    }
    async getSigningKeyByPublicKey(
        publicKey: string
    ): Promise<SigningKey | undefined> {
        const keys = await this.listSigningKeys(this.userId)
        return keys.find((key) => key.publicKey === publicKey)
    }
    async getSigningKeyByName(
        userId: string,
        name: string
    ): Promise<SigningKey | undefined> {
        const keys = await this.listSigningKeys(this.userId)
        return keys.find((key) => key.name === name)
    }
    async listSigningTransactionsByTxIdsAndPublicKeys(
        txIds: string[],
        publicKeys: string[]
    ): Promise<SigningTransaction[]> {
        if (!txIds.length && !publicKeys.length) return []

        const records = await this.listSigningTransactions(this.userId)

        return records.filter((record) => {
            if (!record) return false

            const matchesTxId = txIds.length > 0 && txIds.includes(record.id)
            const matchesPublicKey =
                publicKeys.length > 0 && publicKeys.includes(record.publicKey)

            return matchesTxId || matchesPublicKey
        })
    }

    async setSigningKey(userId: string, key: SigningKey): Promise<void> {
        const item = signingKeysItem()
        const keys = await item.getValue()
        const idx = keys?.findIndex((k) => k.id === key.id)
        const existing = idx >= 0 ? keys[idx] : undefined

        const serialized = fromSigningKey(key, userId)

        const updated: SigningKeyRecord = {
            ...serialized,
            createdAt: existing?.createdAt ?? serialized.createdAt,
            updatedAt: new Date().toISOString(),
        }

        const nextKeys =
            idx >= 0
                ? keys.map((key, index) => (index === idx ? updated : key))
                : [...keys, updated]

        await item.setValue(nextKeys)
    }
    async deleteSigningKey(userId: string, keyId: string): Promise<void> {
        const item = signingKeysItem()
        const keys = await item.getValue()

        const nextKeys = keys.filter((k) => k.id !== keyId)
        if (nextKeys.length !== keys.length) {
            await item.setValue(nextKeys)
        }
    }

    async listSigningKeys(userId: string): Promise<SigningKey[]> {
        const keys = await signingKeysItem().getValue()
        return keys.map((x) => toSigningKey(x))
    }
    async getSigningTransaction(
        userId: string,
        txId: string
    ): Promise<SigningTransaction | undefined> {
        const records = await signingTransactionsItem().getValue()

        const tx = records ? records.find((r) => r.id === txId) : undefined
        return tx ? toSigningTransaction(tx) : undefined
    }

    async setSigningTransaction(
        userId: string,
        transaction: SigningTransaction
    ): Promise<void> {
        await updateSigningTransactions((txs) => {
            const idx = txs?.findIndex((k) => k.id === transaction.id)
            const existing = idx >= 0 ? txs[idx] : undefined
            const serialized = fromSigningTransaction(transaction, userId)

            const updated: SigningTransactionRecord = {
                ...serialized,
                createdAt: existing?.createdAt ?? serialized.createdAt,
                updatedAt: new Date().toISOString(),
            }

            return idx >= 0
                ? txs.map((key, index) => (index === idx ? updated : key))
                : [...txs, updated]
        })
    }

    async updateSigningTransactionStatus(
        userId: string,
        txId: string,
        status: SigningDriverStatus
    ): Promise<void> {
        await updateSigningTransactions((txs) => {
            const idx = txs?.findIndex((tx) => tx.id === txId)
            if (idx === -1) {
                throw new Error(
                    `No signing tx found for txId: ${txId}, userId: ${this.userId}`
                )
            }

            const updated: SigningTransactionRecord = {
                ...txs[idx],
                status: status,
                updatedAt: new Date().toISOString(),
            }

            return txs.map((t, i) => (i === idx ? updated : t))
        })
    }
    async listSigningTransactions(
        userId: string,
        limit?: number,
        before?: string
    ): Promise<SigningTransaction[]> {
        const txs = (await signingTransactionsItem().getValue()).map((x) =>
            toSigningTransaction(x)
        )
        const validTxs = txs.sort((a, b) =>
            a.createdAt.toISOString().localeCompare(b.createdAt.toISOString())
        )

        let beforeDate: string | undefined = before

        if (before) {
            const isIsoDate = !isNaN(Date.parse(before)) && before.includes('T')
            if (!isIsoDate) {
                const targetTx = await this.getSigningTransaction(
                    userId,
                    before
                )
                if (targetTx) {
                    beforeDate = targetTx.createdAt.toISOString()
                }
            }
        }

        const filteredTxs = beforeDate
            ? validTxs.filter((k) => k.createdAt.toISOString() < beforeDate!)
            : validTxs

        return limit ? filteredTxs.slice(0, limit) : filteredTxs
    }

    async getSigningDriverConfiguration(
        userId: string,
        driverId: string
    ): Promise<SigningDriverConfig | undefined> {
        const record = await signingDriverConfigItem(driverId).getValue()
        return record ? toSigningDriverConfig(record) : undefined
    }
    async setSigningDriverConfiguration(
        userId: string,
        config: SigningDriverConfig
    ): Promise<void> {
        const item = signingDriverConfigItem(config.driverId)
        const existing = await item.getValue()
        const serialized = fromSigningDriverConfig(config, userId)

        if (existing && existing.config === serialized.config) return

        await item.setValue(serialized)
    }
    async setSigningKeys(userId: string, keys: SigningKey[]): Promise<void> {
        const item = signingKeysItem()
        const existingKeys = await item.getValue()
        const keyMap = new Map(existingKeys.map((k) => [k.id, k]))

        for (const key of keys) {
            const existing = keyMap.get(key.id)
            const serialized = fromSigningKey(key, this.userId)
            keyMap.set(key.id, {
                ...serialized,
                createdAt: existing?.createdAt ?? serialized.createdAt,
                updatedAt: new Date().toISOString(),
            })
        }

        await item.setValue(Array.from(keyMap.values()))
    }
    async setSigningTransactions(
        userId: string,
        transactions: SigningTransaction[]
    ): Promise<void> {
        await updateSigningTransactions((existingTxs) => {
            const txMap = new Map(existingTxs.map((tx) => [tx.id, tx]))

            for (const tx of transactions) {
                const existing = txMap.get(tx.id)
                const serialized = fromSigningTransaction(tx, this.userId)
                txMap.set(tx.id, {
                    ...serialized,
                    createdAt: existing?.createdAt ?? serialized.createdAt,
                    updatedAt: new Date().toISOString(),
                })
            }

            return Array.from(txMap.values())
        })
    }
}
