// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type {
    SigningDriverConfig,
    SigningKey,
    SigningTransaction,
} from '@canton-network/core-signing-lib'
import { afterEach, describe, expect, beforeEach, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { WxtStore } from './store-wxt.js'
import { signingKeysItem, signingTransactionsItem } from './items.js'

describe('storage wxt', () => {
    beforeEach(() => {
        fakeBrowser.reset()
    })
    afterEach(() => {
        vi.restoreAllMocks()
    })
    const t0 = new Date('2024-01-01T00:00:00.000Z')
    const t1 = new Date('2024-01-02T00:00:00.000Z')
    const t2 = new Date('2024-01-03T00:00:00.000Z')

    const createMockKey = (
        id: string,
        name: string,
        publicKey: string
    ): SigningKey => {
        return {
            id,
            name,
            publicKey,
            privateKey: 'priv-key-456',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        }
    }

    const makeTx = (
        overrides: Partial<SigningTransaction> &
            Pick<SigningTransaction, 'id' | 'hash' | 'publicKey'>
    ): SigningTransaction => ({
        status: 'pending',
        createdAt: t0,
        updatedAt: t0,
        ...overrides,
    })
    const userId = 'user-1'

    // Holds every local storage read until released. Each read resolves with
    // the value it saw when issued, like overlapping async browser reads.
    const holdStorageReads = () => {
        const local = fakeBrowser.storage.local
        const get = local.get.bind(local) as (
            keys: string | string[]
        ) => Promise<Record<string, unknown>>
        let release!: () => void
        const released = new Promise<void>((resolve) => {
            release = resolve
        })
        vi.spyOn(local, 'get').mockImplementation((async (
            keys: string | string[]
        ) => {
            const result = await get(keys)
            await released
            return result
        }) as typeof local.get)
        return release
    }
    // Fake storage is promise-based, so one macrotask lets every started
    // operation run until it waits on a held read or on another operation.
    const settleStorage = () =>
        new Promise<void>((resolve) => setTimeout(resolve))
    const listIds = async (store: WxtStore) =>
        (await store.listSigningTransactions(userId)).map((tx) => tx.id).sort()

    it('should successfully save and retrieve a signing key', async () => {
        const store = new WxtStore(userId)
        const mockKey = createMockKey('key1', 'key1', 'pubkey-123')
        await store.setSigningKey(userId, mockKey)

        const retrieved = await store.getSigningKey(userId, 'key1')
        expect(retrieved).toBeDefined()
        expect(retrieved?.id).toBe(mockKey.id)
        expect(retrieved?.publicKey).toBe(mockKey.publicKey)

        const index = await signingKeysItem().getValue()
        const retrievedIndex = index.find((x) => x.id === mockKey.id)
        expect(retrievedIndex).toBeDefined()
        expect(retrievedIndex?.id).toBe(mockKey.id)
        expect(retrievedIndex?.publicKey).toBe(mockKey.publicKey)
    })

    it('should successfully delete a signing key and clean up indexes', async () => {
        const store = new WxtStore(userId)
        const mockKey = createMockKey('key1', 'key1', 'pubkey-123')
        await store.setSigningKey(userId, mockKey)

        await store.deleteSigningKey(userId, 'key1')

        const retrieved = await store.getSigningKey(userId, 'key1')
        expect(retrieved).toBeUndefined()

        const index = await signingKeysItem().getValue()
        const retrievedIndex = index.find((x) => x.id === mockKey.id)
        expect(retrievedIndex).toBeUndefined()
    })

    it('should get signing key by various filters', async () => {
        const store = new WxtStore(userId)
        const mockKey1 = createMockKey('key1', 'key1', 'pubkey-123')
        const mockKey2 = createMockKey('key2', 'key2', 'pubkey-456')
        await store.setSigningKeys(userId, [mockKey1, mockKey2])

        const retrievedKeyByPublicKey =
            await store.getSigningKeyByPublicKey('pubkey-456')

        expect(retrievedKeyByPublicKey).toBeDefined()
        expect(retrievedKeyByPublicKey?.id).toBe(mockKey2.id)
        expect(retrievedKeyByPublicKey?.name).toBe(mockKey2.name)
        expect(retrievedKeyByPublicKey?.publicKey).toBe(mockKey2.publicKey)

        const retrievedKeyByName = await store.getSigningKeyByName(
            'user-1',
            'key1'
        )

        expect(retrievedKeyByName).toBeDefined()
        expect(retrievedKeyByName?.id).toBe(mockKey1.id)
        expect(retrievedKeyByName?.name).toBe(mockKey1.name)
        expect(retrievedKeyByName?.publicKey).toBe(mockKey1.publicKey)

        const allSigningKeys = await store.listSigningKeys(userId)
        expect(allSigningKeys.length).toBe(2)
        expect(allSigningKeys.map((x) => x.id)).toEqual(
            [mockKey1, mockKey2].map((x) => x.id)
        )
    })

    it('sets, gets, and lists transactionss', async () => {
        const store = new WxtStore(userId)
        const tx = makeTx({
            id: 'tx-1',
            hash: 'hash-1',
            publicKey: 'pub-tx',
            status: 'pending',
            metadata: { note: 'test' },
        })

        await store.setSigningTransaction(userId, tx)
        expect(await store.getSigningTransaction(userId, 'tx-1')).toMatchObject(
            {
                id: tx.id,
                hash: tx.hash,
                status: 'pending',
                metadata: tx.metadata,
            }
        )

        const listed = await store.listSigningTransactions(userId, 10)
        expect(listed).toHaveLength(1)
    })

    it('upserts transactions and preserves bulk updates via setSigningTransactions', async () => {
        const store = new WxtStore(userId)
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

        const updated = await store.getSigningTransaction(userId, 'tx-upsert')
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

    it('updates signing transaction status', async () => {
        const store = new WxtStore(userId)
        const tx = makeTx({
            id: 'tx-status change',
            hash: 'h1',
            publicKey: 'pub',
        })
        await store.setSigningTransaction(userId, {
            ...tx,
            status: 'pending',
        })

        const pending = await store.getSigningTransaction(userId, tx.id)
        expect(pending?.status).toBe('pending')

        await store.updateSigningTransactionStatus(userId, tx.id, 'signed')
        const signed = await store.getSigningTransaction(userId, tx.id)
        expect(signed?.status).toBe('signed')
    })

    it('keeps concurrent signing transaction writes from separate stores', async () => {
        const release = holdStorageReads()
        const writes = [
            new WxtStore(userId).setSigningTransaction(
                userId,
                makeTx({ id: 'tx-a', hash: 'ha', publicKey: 'pub' })
            ),
            new WxtStore(userId).setSigningTransaction(
                userId,
                makeTx({ id: 'tx-b', hash: 'hb', publicKey: 'pub' })
            ),
        ]
        await settleStorage()
        release()
        await Promise.all(writes)

        expect(await listIds(new WxtStore(userId))).toEqual(['tx-a', 'tx-b'])
    })

    it('serializes bulk writes, status updates, and single writes', async () => {
        const store = new WxtStore(userId)
        await store.setSigningTransaction(
            userId,
            makeTx({
                id: 'tx-a',
                hash: 'ha',
                publicKey: 'pub',
                metadata: { note: 'kept' },
            })
        )
        const created = await signingTransactionsItem().getValue()

        const release = holdStorageReads()
        const writes = [
            store.setSigningTransactions(userId, [
                makeTx({ id: 'tx-b', hash: 'hb', publicKey: 'pub' }),
                makeTx({ id: 'tx-c', hash: 'hc', publicKey: 'pub' }),
            ]),
            new WxtStore(userId).updateSigningTransactionStatus(
                userId,
                'tx-a',
                'signed'
            ),
            new WxtStore(userId).setSigningTransaction(
                userId,
                makeTx({ id: 'tx-d', hash: 'hd', publicKey: 'pub' })
            ),
        ]
        await settleStorage()
        release()
        await Promise.all(writes)

        expect(await listIds(store)).toEqual(['tx-a', 'tx-b', 'tx-c', 'tx-d'])
        const records = await signingTransactionsItem().getValue()
        expect(records.find((r) => r.id === 'tx-a')).toMatchObject({
            userId,
            status: 'signed',
            metadata: created[0]!.metadata,
            createdAt: created[0]!.createdAt,
        })
    })

    it('reports a failed write to its caller without blocking later writes', async () => {
        const store = new WxtStore(userId)
        const local = fakeBrowser.storage.local
        vi.spyOn(local, 'set').mockRejectedValueOnce(
            new Error('quota exceeded')
        )
        const release = holdStorageReads()

        const failedWrite = store.setSigningTransaction(
            userId,
            makeTx({ id: 'tx-fail', hash: 'hf', publicKey: 'pub' })
        )
        const missingUpdate = store.updateSigningTransactionStatus(
            userId,
            'tx-missing',
            'signed'
        )
        const laterWrite = new WxtStore(userId).setSigningTransaction(
            userId,
            makeTx({ id: 'tx-ok', hash: 'ho', publicKey: 'pub' })
        )
        await settleStorage()
        release()

        await expect(failedWrite).rejects.toThrow('quota exceeded')
        await expect(missingUpdate).rejects.toThrow(
            'No signing tx found for txId: tx-missing'
        )
        await laterWrite
        await store.setSigningTransaction(
            userId,
            makeTx({ id: 'tx-after', hash: 'hn', publicKey: 'pub' })
        )

        expect(await listIds(store)).toEqual(['tx-after', 'tx-ok'])
    })

    it('listSigningTransactions respects limit and before param', async () => {
        const store = new WxtStore(userId)
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

        expect(await store.listSigningTransactions(userId, 1)).toHaveLength(1)

        const page2 = await store.listSigningTransactions(userId, 10, 'tx-new')
        expect(page2.map((t) => t.id)).toEqual(['tx-old'])
    })

    it('listSigningTransactionsByTxIdsAndPublicKeys matches ids or public keys', async () => {
        const store = new WxtStore(userId)
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

        const found = await store.listSigningTransactionsByTxIdsAndPublicKeys(
            ['by-id'],
            ['pub-b']
        )
        expect(found.map((t) => t.id).sort()).toEqual(['by-id', 'by-pub'])
    })

    it('sets and retrieves driver configuration with upsert', async () => {
        const store = new WxtStore(userId)
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
