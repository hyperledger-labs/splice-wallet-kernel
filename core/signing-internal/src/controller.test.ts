import { expect, test } from '@jest/globals'

// import request from 'supertest'
import { InternalSigningDriver } from './controller.js'
import { CreateKeyResult, isRpcError, Key, Transaction } from 'core-signing-lib'
import nacl from 'tweetnacl'
import naclUtil from 'tweetnacl-util'

const TEST_KEY_NAME = 'test-key-name'
const TEST_TRANSACTION = 'test-tx'
const TEST_TRANSACTION_HASH =
    '88beb0783e394f6128699bad42906374ab64197d260db05bb0cfeeb518ba3ac2'

interface TestValues {
    signingDriver: InternalSigningDriver
    key: CreateKeyResult
}

async function setupTest(keyName: string = TEST_KEY_NAME): Promise<TestValues> {
    const signingDriver = new InternalSigningDriver()
    const key = await signingDriver.controller.createKey({ name: keyName })
    return {
        signingDriver,
        key,
    }
}

test('key creation', async () => {
    const { signingDriver, key } = await setupTest()
    const keys = await signingDriver.controller.getKeys()
    expect(
        keys.keys?.find(
            (k: Key) => k.id === key.id && k.publicKey === key.publicKey
        )
    ).toBeDefined()
})

test('transaction signature', async () => {
    const { signingDriver, key } = await setupTest()
    const tx = await signingDriver.controller.signTransaction({
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

    const transactionsByKey = await signingDriver.controller.getTransactions({
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

    const transactionsById = await signingDriver.controller.getTransactions({
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
