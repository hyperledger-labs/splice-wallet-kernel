// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect, test, vi } from 'vitest'

// import request from 'supertest'
import { InternalSigningDriver } from './controller.js'
import {
    createKeyPair,
    type Error as RpcError,
    isRpcError,
    type Key,
    type Methods,
    type Transaction,
} from '@canton-network/core-signing-lib'
import nacl from 'tweetnacl'
import naclUtil from 'tweetnacl-util'
import type { AuthContext } from '@canton-network/core-wallet-auth'
import {
    StoreSql,
    connection,
    migrator,
} from '@canton-network/core-signing-store-sql'
import { pino } from 'pino'

const TEST_KEY_NAME = 'test-key-name'
const TEST_TRANSACTION = 'test-tx'
const TEST_TRANSACTION_HASH =
    '88beb0783e394f6128699bad42906374ab64197d260db05bb0cfeeb518ba3ac2'

const authContext: AuthContext = {
    userId: 'test-user-id',
    accessToken: 'test-access-token',
}

function assertNotRpcError<T>(value: T | RpcError): asserts value is T {
    if (isRpcError(value)) {
        throw new Error(
            `Expected a successful RPC result, got: ${value.error_description}`
        )
    }
}

interface TestValues {
    signingDriver: InternalSigningDriver
    key: Key
    controller: Methods
    store: StoreSql
}

const nextTurn = () => new Promise<void>((resolve) => setImmediate(resolve))

async function setupTest(keyName: string = TEST_KEY_NAME): Promise<TestValues> {
    const db = connection({
        connection: {
            type: 'sqlite',
            database: 'testInternalStore.sqlite',
        },
    })
    const umzug = migrator(db)
    const pending = await umzug.pending()
    if (pending.length > 0) {
        await umzug.up()
    }
    const store = new StoreSql(db, pino({ level: 'silent' }), authContext)

    const signingDriver = new InternalSigningDriver(store)
    const controller = signingDriver.controller(authContext.userId)
    const key = await controller.createKey({ name: keyName })
    assertNotRpcError(key)
    return {
        signingDriver,
        key,
        controller,
        store,
    }
}

test('key creation', async () => {
    const { controller, key } = await setupTest()
    const keys = await controller.getKeys()
    assertNotRpcError(keys)
    expect(
        keys.keys?.find(
            (k: Key) => k.id === key.id && k.publicKey === key.publicKey
        )
    ).toBeDefined()
})

test('transaction signature', async () => {
    const { controller, key } = await setupTest()
    const tx = await controller.signTransaction({
        tx: TEST_TRANSACTION,
        txHash: TEST_TRANSACTION_HASH,
        keyIdentifier: {
            publicKey: key.publicKey,
        },
    })

    assertNotRpcError(tx)
    expect(tx.status).toBe('signed')
    expect(tx.signature).toBeDefined()

    expect(
        nacl.sign.detached.verify(
            naclUtil.decodeBase64(TEST_TRANSACTION_HASH),
            naclUtil.decodeBase64(tx.signature || ''),
            naclUtil.decodeBase64(key.publicKey)
        )
    ).toBe(true)

    const transactionsByKey = await controller.getTransactions({
        publicKeys: [key.publicKey],
    })
    assertNotRpcError(transactionsByKey)
    expect(
        transactionsByKey.transactions?.find(
            (t: Transaction) => t.txId === tx.txId
        )
    ).toBeDefined()

    const transactionsById = await controller.getTransactions({
        txIds: [tx.txId],
    })
    assertNotRpcError(transactionsById)
    expect(
        transactionsById.transactions?.find(
            (t: Transaction) => t.txId === tx.txId
        )
    ).toBeDefined()
})

const TEST_MESSAGE = 'hello world'

test('signMessage signs a message with a stored key', async () => {
    const { controller, key } = await setupTest()

    const result = await controller.signMessage({
        message: TEST_MESSAGE,
        keyIdentifier: { publicKey: key.publicKey },
    })

    assertNotRpcError(result)
    expect(result.signature).toBeDefined()
    expect(
        nacl.sign.detached.verify(
            new TextEncoder().encode(TEST_MESSAGE),
            naclUtil.decodeBase64(result.signature),
            naclUtil.decodeBase64(key.publicKey)
        )
    ).toBe(true)
})

test('signMessage returns key_not_found when the publicKey is missing', async () => {
    const { controller } = await setupTest()

    const result = await controller.signMessage({
        message: TEST_MESSAGE,
        keyIdentifier: { id: 'id not supported' },
    })

    expect(isRpcError(result)).toBe(true)
    if (isRpcError(result)) {
        expect(result.error).toBe('key_not_found')
    }
})

test('signMessage returns key_not_found when the key is unknown', async () => {
    const { controller } = await setupTest()
    const { publicKey } = createKeyPair()

    const result = await controller.signMessage({
        message: TEST_MESSAGE,
        keyIdentifier: { publicKey },
    })

    expect(isRpcError(result)).toBe(true)
    if (isRpcError(result)) {
        expect(result.error).toBe('key_not_found')
    }
})

test('signTransaction returns key_not_found when the publicKey is missing', async () => {
    const { controller } = await setupTest()

    const result = await controller.signTransaction({
        tx: TEST_TRANSACTION,
        txHash: TEST_TRANSACTION_HASH,
        keyIdentifier: { id: 'no-public-key' },
    })

    expect(isRpcError(result)).toBe(true)
    if (isRpcError(result)) {
        expect(result.error).toBe('key_not_found')
    }
})

test('signTransaction returns key_not_found when the key is unknown', async () => {
    const { controller } = await setupTest()
    const { publicKey } = createKeyPair()

    const result = await controller.signTransaction({
        tx: TEST_TRANSACTION,
        txHash: TEST_TRANSACTION_HASH,
        keyIdentifier: { publicKey },
    })

    expect(isRpcError(result)).toBe(true)
    if (isRpcError(result)) {
        expect(result.error).toBe('key_not_found')
    }
})

test('signTransaction returns userId_not_found when no userId is set', async () => {
    const { signingDriver, key } = await setupTest()
    const controller = signingDriver.controller(undefined)

    const result = await controller.signTransaction({
        tx: TEST_TRANSACTION,
        txHash: TEST_TRANSACTION_HASH,
        keyIdentifier: { publicKey: key.publicKey },
    })

    expect(isRpcError(result)).toBe(true)
    if (isRpcError(result)) {
        expect(result.error).toBe('userId_not_found')
    }
})

test('getTransaction returns a stored transaction', async () => {
    const { controller, key } = await setupTest()
    const tx = await controller.signTransaction({
        tx: TEST_TRANSACTION,
        txHash: TEST_TRANSACTION_HASH,
        keyIdentifier: { publicKey: key.publicKey },
    })
    assertNotRpcError(tx)

    const result = await controller.getTransaction({ txId: tx.txId })

    assertNotRpcError(result)
    expect(result.txId).toBe(tx.txId)
    expect(result.status).toBe('signed')
    expect(result.publicKey).toBe(key.publicKey)
})

test('signTransaction resolves only after the signature is persisted', async () => {
    const { controller, key, store } = await setupTest()
    const persist = store.setSigningTransaction.bind(store)
    const writeStarted = Promise.withResolvers<void>()
    const writeGate = Promise.withResolvers<void>()
    vi.spyOn(store, 'setSigningTransaction').mockImplementationOnce(
        async (userId, transaction) => {
            writeStarted.resolve()
            await writeGate.promise
            await persist(userId, transaction)
        }
    )

    let settled = false
    const signing = controller
        .signTransaction({
            tx: TEST_TRANSACTION,
            txHash: TEST_TRANSACTION_HASH,
            keyIdentifier: { publicKey: key.publicKey },
        })
        .finally(() => {
            settled = true
        })

    await writeStarted.promise
    await nextTurn()
    expect(settled).toBe(false)

    writeGate.resolve()
    const tx = await signing
    assertNotRpcError(tx)
    expect(tx.status).toBe('signed')

    const stored = await controller.getTransaction({ txId: tx.txId })
    assertNotRpcError(stored)
    expect(stored.status).toBe('signed')
    expect(stored.signature).toBe(tx.signature)
    expect(stored.publicKey).toBe(key.publicKey)
})

test('signTransaction does not return a signature when persistence fails', async () => {
    const { controller, key, store } = await setupTest()
    const writeError = new Error('write failed')
    vi.spyOn(store, 'setSigningTransaction').mockRejectedValueOnce(writeError)

    await expect(
        controller.signTransaction({
            tx: TEST_TRANSACTION,
            txHash: TEST_TRANSACTION_HASH,
            keyIdentifier: { publicKey: key.publicKey },
        })
    ).rejects.toBe(writeError)
})

test('getTransaction returns transaction_not_found for an unknown id', async () => {
    const { controller } = await setupTest()

    const result = await controller.getTransaction({
        txId: 'does-not-exist',
    })

    expect(isRpcError(result)).toBe(true)
    if (isRpcError(result)) {
        expect(result.error).toBe('transaction_not_found')
    }
})

test('getTransaction returns userId_not_found when no userId is set', async () => {
    const { signingDriver } = await setupTest()
    const controller = signingDriver.controller(undefined)

    const result = await controller.getTransaction({ txId: 'any' })

    expect(isRpcError(result)).toBe(true)
    if (isRpcError(result)) {
        expect(result.error).toBe('userId_not_found')
    }
})

test('getTransactions returns bad_arguments when no filter is supplied', async () => {
    const { controller } = await setupTest()

    const result = await controller.getTransactions({})

    expect(isRpcError(result)).toBe(true)
    if (isRpcError(result)) {
        expect(result.error).toBe('bad_arguments')
    }
})

test('getTransactions returns userId_not_found when no userId is set', async () => {
    const { signingDriver } = await setupTest()
    const controller = signingDriver.controller(undefined)

    const result = await controller.getTransactions({ txIds: ['any'] })

    expect(isRpcError(result)).toBe(true)
    if (isRpcError(result)) {
        expect(result.error).toBe('userId_not_found')
    }
})

test('getKeys returns userId_not_found when no userId is set', async () => {
    const { signingDriver } = await setupTest()
    const controller = signingDriver.controller(undefined)

    const result = await controller.getKeys()

    expect(isRpcError(result)).toBe(true)
    if (isRpcError(result)) {
        expect(result.error).toBe('userId_not_found')
    }
})

test('createKey returns userId_not_found when no userId is set', async () => {
    const { signingDriver } = await setupTest()
    const controller = signingDriver.controller(undefined)

    const result = await controller.createKey({ name: TEST_KEY_NAME })

    expect(isRpcError(result)).toBe(true)
    if (isRpcError(result)) {
        expect(result.error).toBe('userId_not_found')
    }
})

test('getConfiguration, setConfiguration and subscribeTransactions return empty results', async () => {
    const { controller } = await setupTest()

    expect(await controller.getConfiguration()).toEqual({})
    expect(await controller.setConfiguration({})).toEqual({})
    expect(await controller.subscribeTransactions({ txIds: [] })).toEqual({})
})
