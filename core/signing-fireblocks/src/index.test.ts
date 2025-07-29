import { expect, test } from '@jest/globals'

import FireblocksSigningDriver from './index'
import { readFileSync } from 'fs-extra'
import path from 'path'

import {
    CreateKeyResult,
    isRpcError,
    Transaction,
    Error as RpcError,
    CC_COIN_TYPE,
} from 'core-signing-lib'
import { PublicKeyInformationAlgorithmEnum } from '@fireblocks/ts-sdk'
import { AuthContext } from 'core-wallet-auth'
import { Methods } from 'core-signing-lib/dist/rpc-gen'

const TEST_KEY_NAME = 'test-key-name'
const TEST_TRANSACTION = 'test-tx'
const TEST_TRANSACTION_HASH =
    '88beb0783e394f6128699bad42906374ab64197d260db05bb0cfeeb518ba3ac2'

const TEST_FIREBLOCKS_DERIVATION_PATH = [42, CC_COIN_TYPE, 4, 0, 0]
const TEST_FIREBLOCKS_VAULT_ID = TEST_FIREBLOCKS_DERIVATION_PATH.join('-')
const TEST_FIREBLOCKS_PUBLIC_KEY =
    '02fefbcc9aebc8a479f211167a9f564df53aefd603a8662d9449a98c1ead2eba'

const authContext: AuthContext = {
    userId: 'test-user-id',
    accessToken: 'test-access-token',
}

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
    controller: Methods
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
            defaultKeyInfo: {
                apiKey: 'mocked',
                apiSecret: 'mocked',
            },
            userApiKeys: new Map(),
        })
    } else {
        const secretPath = path.resolve(process.cwd(), secretLocation)
        const apiSecret = readFileSync(secretPath, 'utf8')
        signingDriver = new FireblocksSigningDriver({
            defaultKeyInfo: {
                apiKey,
                apiSecret,
            },
            userApiKeys: new Map(),
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
        controller: signingDriver.controller(authContext),
    }
}

test.skip('key creation', async () => {
    const { controller } = await setupTest()
    const err = await controller.createKey({ name: 'test' })
    expect(isRpcError(err)).toBe(true)
})

test('transaction signature', async () => {
    const { controller, key } = await setupTest()
    const tx = await controller.signTransaction({
        tx: TEST_TRANSACTION,
        txHash: TEST_TRANSACTION_HASH,
        publicKey: key.publicKey,
    })

    throwWhenRpcError(tx)

    // this hash has already been signed so Fireblocks won't bother getting it signed again
    expect(tx.status).toBe('signed')

    const transactionsByKey = await controller.getTransactions({
        publicKeys: [key.publicKey],
    })

    throwWhenRpcError(transactionsByKey)
    expect(
        transactionsByKey.transactions?.find(
            (t: Transaction) => t.txId === tx.txId
        )
    ).toBeDefined()

    const transactionsById = await controller.getTransactions({
        txIds: [tx.txId],
    })

    throwWhenRpcError(transactionsById)
    expect(
        transactionsById.transactions?.find(
            (t: Transaction) => t.txId === tx.txId
        )
    ).toBeDefined()

    const foundTx = await controller.getTransaction({
        txId: tx.txId,
    })
    throwWhenRpcError(foundTx)
}, 60000)

test('test config change', async () => {
    const { controller } = await setupTest()
    const newPath = 'new-path'

    const config = await controller.getConfiguration()
    controller.setConfiguration({
        defaultKeyInfo: config.defaultKeyInfo,
        userApiKeys: config.userApiKeys,
        apiPath: newPath,
    })

    const newConfig = await controller.getConfiguration()
    expect(newConfig.apiPath).toBe(newPath)
})
