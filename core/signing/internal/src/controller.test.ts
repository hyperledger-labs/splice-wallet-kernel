import { expect, test } from '@jest/globals'

// import request from 'supertest'
import { InternalSigner } from './controller.js'
import { CreateKeyResult, isRpcError } from 'core-signing-lib'
import nacl from 'tweetnacl'
import naclUtil from 'tweetnacl-util'

const TEST_KEY_NAME = 'test-key-name'
const TEST_TRANSACTION = 'test-tx'
const TEST_TRANSACTION_HASH =
    '88beb0783e394f6128699bad42906374ab64197d260db05bb0cfeeb518ba3ac2'

interface TestValues {
    signer: InternalSigner
    key: CreateKeyResult
}

async function setupTest(keyName: string = TEST_KEY_NAME): Promise<TestValues> {
    const signer = new InternalSigner()
    const key = await signer.signerController.createKey({ name: keyName })
    return {
        signer,
        key,
    }
}

test('key creation', async () => {
    const { signer, key } = await setupTest()
    const keys = await signer.signerController.getKeys()
    expect(
        keys.keys?.find((k) => k.id === key.id && k.publicKey === key.publicKey)
    ).toBeDefined()
})

test('transaction signature', async () => {
    const { signer, key } = await setupTest()
    const tx = await signer.signerController.signTransaction({
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

    const transactionsByKey = await signer.signerController.getTransactions({
        publicKeys: [key.publicKey],
    })
    if (isRpcError(transactionsByKey)) {
        throw new Error(
            `Expected valid transactions, but got an error: ${transactionsByKey.error_description}`
        )
    }
    expect(
        transactionsByKey.transactions?.find((t) => t.txId === tx.txId)
    ).toBeDefined()

    const transactionsById = await signer.signerController.getTransactions({
        txIds: [tx.txId],
    })
    if (isRpcError(transactionsById)) {
        throw new Error(
            `Expected valid transactions, but got an error: ${transactionsById.error_description}`
        )
    }
    expect(
        transactionsById.transactions?.find((t) => t.txId === tx.txId)
    ).toBeDefined()
})
