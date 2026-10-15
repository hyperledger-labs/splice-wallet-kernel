// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test, beforeEach, afterEach } from 'vitest'
import type {
    SigningDriverConfig,
    SigningKey,
    SigningTransaction,
} from '@canton-network/core-signing-lib'
import type { AuthContext } from '@canton-network/core-wallet-auth'
import type { Kysely } from 'kysely'
import { migrator } from './migrator.js'
import type { DB } from './schema.js'
import { connection, StoreSql } from './store-sql.js'

const userId = 'test-user-id'
const otherUserId = 'other-user-id'

const authContext: AuthContext = {
    userId,
    accessToken: 'test-access-token',
}

const storeConfig = { connection: { type: 'memory' as const } }

const t0 = new Date('2024-01-01T00:00:00.000Z')
const t1 = new Date('2024-01-02T00:00:00.000Z')
const t2 = new Date('2024-01-03T00:00:00.000Z')

const makeKey = (
    overrides: Partial<SigningKey> &
        Pick<SigningKey, 'id' | 'name' | 'publicKey'>
): SigningKey => ({
    createdAt: t0,
    updatedAt: t0,
    ...overrides,
})

const makeTx = (
    overrides: Partial<SigningTransaction> &
        Pick<SigningTransaction, 'id' | 'hash' | 'publicKey'>
): SigningTransaction => ({
    status: 'pending',
    createdAt: t0,
    updatedAt: t0,
    ...overrides,
})

describe('StoreSql', () => {
    let db: Kysely<DB>

    beforeEach(async () => {
        db = connection(storeConfig)
        await migrator(db).up()
    })

    afterEach(async () => {
        await db.destroy()
    })

    test('withAuthContext returns a scoped store instance', () => {
        const store = new StoreSql(db)
        const scoped = store.withAuthContext(authContext)
        expect(scoped).toBeInstanceOf(StoreSql)
        expect(scoped.authContext).toEqual(authContext)
    })

    describe('signing keys', () => {
        test('sets, lists, and retrieves keys by id, name, and public key', async () => {
            const store = new StoreSql(db)
            const key = makeKey({
                id: 'key-1',
                name: 'key',
                publicKey: 'pub-1',
                privateKey: 'priv-1',
                metadata: { index: 0 },
            })

            await store.setSigningKey(userId, key)

            expect(await store.getSigningKey(userId, 'key-1')).toMatchObject({
                id: key.id,
                name: key.name,
                publicKey: key.publicKey,
                privateKey: key.privateKey,
                metadata: key.metadata,
            })
            expect(
                await store.getSigningKeyByName(userId, 'key')
            ).toMatchObject({ id: key.id })
            expect(await store.getSigningKeyByPublicKey('pub-1')).toMatchObject(
                { id: key.id }
            )

            const listed = await store.listSigningKeys(userId)
            expect(listed).toHaveLength(1)
            expect(listed[0]?.id).toBe('key-1')
        })

        test('updates an existing key on conflict', async () => {
            const store = new StoreSql(db)
            const key = makeKey({
                id: 'id-original',
                name: 'name-original',
                publicKey: 'pub-original',
            })
            await store.setSigningKey(userId, key)

            await store.setSigningKey(userId, {
                ...key,
                name: 'name-updated',
                publicKey: 'pub-updated',
            })

            const updated = await store.getSigningKey(userId, 'id-original')
            expect(updated?.name).toBe('name-updated')
            expect(updated?.publicKey).toBe('pub-updated')
        })

        test('deletes keys and returns undefined for missing lookups', async () => {
            const store = new StoreSql(db)
            await store.setSigningKey(
                userId,
                makeKey({
                    id: 'id-del',
                    name: 'name-del',
                    publicKey: 'pub-del',
                })
            )
            await store.deleteSigningKey(userId, 'id-del')

            expect(await store.getSigningKey(userId, 'id-del')).toBeUndefined()
            expect(
                await store.getSigningKeyByName(userId, 'name-del')
            ).toBeUndefined()
            expect(
                await store.getSigningKeyByPublicKey('pub-del')
            ).toBeUndefined()
            expect(await store.listSigningKeys(userId)).toHaveLength(0)
        })

        test('setSigningKeys inserts multiple keys', async () => {
            const store = new StoreSql(db)

            const keys = [
                makeKey({
                    id: 'id-1',
                    name: 'name-1',
                    publicKey: 'pub-1',
                    createdAt: t2,
                    updatedAt: t2,
                }),
                makeKey({
                    id: 'id-2',
                    name: 'name-2',
                    publicKey: 'pub-2',
                    createdAt: t1,
                    updatedAt: t1,
                }),
            ]
            await store.setSigningKeys(userId, keys)

            const listed = await store.listSigningKeys(userId)
            expect(listed.map((k) => k.id)).toEqual(['id-1', 'id-2'])
        })

        test('filters keys per user', async () => {
            const store = new StoreSql(db)
            await store.setSigningKey(
                userId,
                makeKey({ id: 'id-u1', name: 'name-u1', publicKey: 'pub-u1' })
            )
            await store.setSigningKey(
                otherUserId,
                makeKey({ id: 'id-u2', name: 'name-u2', publicKey: 'pub-u2' })
            )

            expect(await store.listSigningKeys(userId)).toHaveLength(1)
            expect(
                await store.getSigningKey(otherUserId, 'id-u1')
            ).toBeUndefined()
        })
    })

    describe('signing transactions', () => {
        test('sets, gets, and lists transactions', async () => {
            const store = new StoreSql(db)
            const tx = makeTx({
                id: 'tx-1',
                hash: 'hash-1',
                publicKey: 'pub-tx',
                status: 'pending',
                metadata: { note: 'test' },
            })

            await store.setSigningTransaction(userId, tx)
            expect(
                await store.getSigningTransaction(userId, 'tx-1')
            ).toMatchObject({
                id: tx.id,
                hash: tx.hash,
                status: 'pending',
                metadata: tx.metadata,
            })

            const listed = await store.listSigningTransactions(userId, 10)
            expect(listed).toHaveLength(1)
        })

        test('upserts transactions and preserves bulk updates via setSigningTransactions', async () => {
            const store = new StoreSql(db)
            const tx = makeTx({
                id: 'tx-upsert',
                hash: 'h1',
                publicKey: 'pub',
            })
            await store.setSigningTransaction(userId, tx)
            await store.setSigningTransaction(userId, {
                ...tx,
                hash: 'h2',
                signature: 'sig',
                status: 'signed',
                signedAt: t1,
                updatedAt: t1,
            })

            const updated = await store.getSigningTransaction(
                userId,
                'tx-upsert'
            )
            expect(updated?.hash).toBe('h2')
            expect(updated?.signature).toBe('sig')
            expect(updated?.status).toBe('signed')

            await store.setSigningTransactions(userId, [])
            await store.setSigningTransactions(userId, [
                makeTx({
                    id: 'bulk-tx',
                    hash: 'bh',
                    publicKey: 'bp',
                    createdAt: t1,
                    updatedAt: t1,
                }),
            ])
            expect(
                await store.getSigningTransaction(userId, 'bulk-tx')
            ).toBeDefined()
        })

        test('updateSigningTransactionStatus to non-signed does not set signedAt', async () => {
            const store = new StoreSql(db)
            await store.setSigningTransaction(
                userId,
                makeTx({ id: 'tx-fail', hash: 'h', publicKey: 'p' })
            )
            await store.updateSigningTransactionStatus(
                userId,
                'tx-fail',
                'failed'
            )
            const tx = await store.getSigningTransaction(userId, 'tx-fail')
            expect(tx?.status).toBe('failed')
            expect(tx?.signedAt).toBeUndefined()
        })

        test('listSigningTransactions respects limit and before param', async () => {
            const store = new StoreSql(db)
            await store.setSigningTransaction(
                userId,
                makeTx({
                    id: 'tx-old',
                    hash: 'h1',
                    publicKey: 'p',
                    createdAt: t0,
                    updatedAt: t0,
                })
            )
            await store.setSigningTransaction(
                userId,
                makeTx({
                    id: 'tx-new',
                    hash: 'h2',
                    publicKey: 'p',
                    createdAt: t2,
                    updatedAt: t2,
                })
            )

            expect(await store.listSigningTransactions(userId, 1)).toHaveLength(
                1
            )

            const page2 = await store.listSigningTransactions(
                userId,
                10,
                'tx-new'
            )
            expect(page2.map((t) => t.id)).toEqual(['tx-old'])
        })

        test('listSigningTransactionsByTxIdsAndPublicKeys matches ids or public keys', async () => {
            const store = new StoreSql(db)
            await store.setSigningTransaction(
                userId,
                makeTx({ id: 'by-id', hash: 'h1', publicKey: 'pub-a' })
            )
            await store.setSigningTransaction(
                userId,
                makeTx({ id: 'by-pub', hash: 'h2', publicKey: 'pub-b' })
            )
            await store.setSigningTransaction(
                userId,
                makeTx({ id: 'other', hash: 'h3', publicKey: 'pub-c' })
            )

            const found =
                await store.listSigningTransactionsByTxIdsAndPublicKeys(
                    ['by-id'],
                    ['pub-b']
                )
            expect(found.map((t) => t.id).sort()).toEqual(['by-id', 'by-pub'])
        })
    })

    describe('signing driver configuration', () => {
        test('sets and retrieves driver configuration with upsert', async () => {
            const store = new StoreSql(db)
            const config: SigningDriverConfig = {
                driverId: 'driver-id',
                config: { property: true },
            }

            await store.setSigningDriverConfiguration(userId, config)
            expect(
                await store.getSigningDriverConfiguration(userId, 'driver-id')
            ).toEqual(config)

            await store.setSigningDriverConfiguration(userId, {
                driverId: 'driver-id',
                config: { property: false },
            })
            expect(
                await store.getSigningDriverConfiguration(userId, 'driver-id')
            ).toEqual({ driverId: 'driver-id', config: { property: false } })

            expect(
                await store.getSigningDriverConfiguration(userId, 'missing')
            ).toBeUndefined()
        })
    })
})
