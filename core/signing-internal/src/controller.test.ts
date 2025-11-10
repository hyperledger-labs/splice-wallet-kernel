// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from '@jest/globals'

// import request from 'supertest'
import { InternalSigningDriver } from './controller.js'
import {
    CreateKeyResult,
    isRpcError,
    Key,
    Methods,
    Transaction,
} from '@canton-network/core-signing-lib'
import nacl from 'tweetnacl'
import naclUtil from 'tweetnacl-util'
import { AuthContext } from '@canton-network/core-wallet-auth'
import {
    StoreSql,
    connection,
    migrator,
} from '@canton-network/core-signing-store-sql'
import { pino } from 'pino'
import { sink } from 'pino-test'

const TEST_KEY_NAME = 'test-key-name'
const TEST_TRANSACTION = 'test-tx'
const TEST_TRANSACTION_HASH =
    '88beb0783e394f6128699bad42906374ab64197d260db05bb0cfeeb518ba3ac2'

const authContext: AuthContext = {
    userId: 'test-user-id',
    accessToken: 'test-access-token',
}

interface TestValues {
    signingDriver: InternalSigningDriver
    key: CreateKeyResult
    controller: Methods
}

async function setupTest(keyName: string = TEST_KEY_NAME): Promise<TestValues> {
    const db = connection({
        connection: {
            type: 'sqlite',
            database: 'store.sqlite',
        },
    })
    const umzug = migrator(db)
    const pending = await umzug.pending()
    if (pending.length > 0) {
        await umzug.up()
    }
    const store = new StoreSql(db, pino(sink()), authContext)

    const signingDriver = new InternalSigningDriver(store)
    const controller = signingDriver.controller(authContext.userId)
    const key = await controller.createKey({ name: keyName })
    return {
        signingDriver,
        key,
        controller,
    }
}

test('key creation', async () => {
    const { controller, key } = await setupTest()
    const keys = await controller.getKeys()
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
        publicKey: key.publicKey,
    })

    if (isRpcError(tx)) {
        throw new Error(
            `Expected a valid transaction, but got an error: ${tx.error_description}`
        )
    }
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
    if (isRpcError(transactionsByKey)) {
        throw new Error(
            `Expected valid transactions, but got an error: ${transactionsByKey.error_description}`
        )
    }
    expect(
        transactionsByKey.transactions?.find(
            (t: Transaction) => t.txId === tx.txId
        )
    ).toBeDefined()

    const transactionsById = await controller.getTransactions({
        txIds: [tx.txId],
    })
    if (isRpcError(transactionsById)) {
        throw new Error(
            `Expected valid transactions, but got an error: ${transactionsById.error_description}`
        )
    }
    expect(
        transactionsById.transactions?.find(
            (t: Transaction) => t.txId === tx.txId
        )
    ).toBeDefined()
})
