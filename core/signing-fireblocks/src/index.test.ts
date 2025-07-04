import { expect, test } from '@jest/globals'

import FireblocksSigningDriver from './index'
import { readFileSync } from 'fs-extra'
import path from 'path'

import {
    CreateKeyResult,
    isRpcError,
    Transaction,
    Error as RpcError,
} from 'core-signing-lib'
import { CC_COIN_TYPE } from './fireblocks.js'
import { PublicKeyInformationAlgorithmEnum } from '@fireblocks/ts-sdk'

const TEST_KEY_NAME = 'test-key-name'
const TEST_TRANSACTION = 'test-tx'
const TEST_TRANSACTION_HASH =
    '88beb0783e394f6128699bad42906374ab64197d260db05bb0cfeeb518ba3ac2'

const TEST_FIREBLOCKS_DERIVATION_PATH = [42, CC_COIN_TYPE, 4, 0, 0]
const TEST_FIREBLOCKS_VAULT_ID = TEST_FIREBLOCKS_DERIVATION_PATH.join('-')
const TEST_FIREBLOCKS_PUBLIC_KEY =
    '02fefbcc9aebc8a479f211167a9f564df53aefd603a8662d9449a98c1ead2eba'

jest.mock('./fireblocks', () => {
    const actual = jest.requireActual('./fireblocks')
    if (process.env.FIREBLOCKS_API_KEY) {
        return actual
    } else {
        return {
            FireblocksHandler: jest.fn().mockImplementation(() => {
                return {
                    constructor: jest.fn(),
                    getPublicKeys: jest.fn().mockResolvedValue([
                        {
                            name: TEST_KEY_NAME,
                            publicKey: TEST_FIREBLOCKS_PUBLIC_KEY,
                            derivationPath: [42, CC_COIN_TYPE, 4, 0, 0],
                            algorithm:
                                PublicKeyInformationAlgorithmEnum.EddsaEd25519,
                        },
                    ]),
                    getTransactions: jest.fn(() => {
                        async function* generator() {
                            yield {
                                txId: TEST_TRANSACTION_HASH,
                                status: 'signed',
                                signature: 'test-signature',
                                publicKey: TEST_FIREBLOCKS_PUBLIC_KEY,
                                derivationPath: TEST_FIREBLOCKS_DERIVATION_PATH,
                            }
                        }
                        return generator()
                    }),
                    signTransaction: jest.fn().mockResolvedValue({
                        txId: TEST_TRANSACTION_HASH,
                        status: 'signed',
                    }),
                }
            }),
        }
    }
})

interface TestValues {
    signingDriver: FireblocksSigningDriver
    key: CreateKeyResult
}

export function throwWhenRpcError<T>(value: T | RpcError): void {
    if (isRpcError(value)) {
        throw new Error(
            `Expected a valid return, but got an error: ${value.error_description}`
        )
    }
}

async function setupTest(keyName: string = TEST_KEY_NAME): Promise<TestValues> {
    let signingDriver: FireblocksSigningDriver
    const apiKey = process.env.FIREBLOCKS_API_KEY
    const secretLocation =
        process.env.SECRET_KEY_LOCATION || 'fireblocks_secret.key'
    if (!apiKey) {
        signingDriver = new FireblocksSigningDriver({
            apiKey: 'mocked',
            apiSecret: 'mocked',
        })
    } else {
        const secretPath = path.resolve(process.cwd(), secretLocation)
        const apiSecret = readFileSync(secretPath, 'utf8')
        signingDriver = new FireblocksSigningDriver({
            apiKey,
            apiSecret,
        })
    }
    const key = {
        id: TEST_FIREBLOCKS_VAULT_ID,
        name: keyName,
        publicKey: TEST_FIREBLOCKS_PUBLIC_KEY,
    }
    return {
        signingDriver,
        key,
    }
}

test('key creation', async () => {
    const { signingDriver } = await setupTest()
    const err = await signingDriver.controller.createKey({ name: 'test' })
    expect(isRpcError(err)).toBe(true)
})

test('transaction signature', async () => {
    const { signingDriver, key } = await setupTest()
    const tx = await signingDriver.controller.signTransaction({
        tx: TEST_TRANSACTION,
        txHash: TEST_TRANSACTION_HASH,
        publicKey: key.publicKey,
    })

    throwWhenRpcError(tx)

    // this hash has already been signed so Fireblocks won't bother getting it signed again
    expect(tx.status).toBe('signed')

    const transactionsByKey = await signingDriver.controller.getTransactions({
        publicKeys: [key.publicKey],
    })

    throwWhenRpcError(transactionsByKey)
    expect(
        transactionsByKey.transactions?.find(
            (t: Transaction) => t.txId === tx.txId
        )
    ).toBeDefined()

    const transactionsById = await signingDriver.controller.getTransactions({
        txIds: [tx.txId],
    })

    throwWhenRpcError(transactionsById)
    expect(
        transactionsById.transactions?.find(
            (t: Transaction) => t.txId === tx.txId
        )
    ).toBeDefined()

    const foundTx = await signingDriver.controller.getTransaction({
        txId: tx.txId,
    })
    throwWhenRpcError(foundTx)
}, 60000)
