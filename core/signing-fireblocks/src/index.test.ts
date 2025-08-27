import { expect, test } from '@jest/globals'

import FireblocksSigningDriver from './index.js'
import { readFileSync } from 'fs-extra'
import path from 'path'

import {
    CreateKeyResult,
    isRpcError,
    Transaction,
    Error as RpcError,
    CC_COIN_TYPE,
} from '@canton-network/core-signing-lib'
import { PublicKeyInformationAlgorithmEnum } from '@fireblocks/ts-sdk'
import { AuthContext } from '@canton-network/core-wallet-auth'
import { Methods } from '@canton-network/core-signing-lib'
import { FireblocksApiKeyInfo, FireblocksTransaction } from './fireblocks.js'

const TEST_KEY_NAME = 'test-key-name'
const TEST_TRANSACTION = 'test-tx'
const TEST_TRANSACTION_HASH =
    '88beb0783e394f6128699bad42906374ab64197d260db05bb0cfeeb518ba3ac2'

const TEST_FIREBLOCKS_DERIVATION_PATH = [42, CC_COIN_TYPE, 4, 0, 0]
const TEST_FIREBLOCKS_VAULT_ID = TEST_FIREBLOCKS_DERIVATION_PATH.join('-')
const TEST_FIREBLOCKS_PUBLIC_KEY =
    '02fefbcc9aebc8a479f211167a9f564df53aefd603a8662d9449a98c1ead2eba'

const FAKE_TRANSACTION: FireblocksTransaction = {
    txId: TEST_TRANSACTION_HASH,
    status: 'signed',
    signature: 'test-signature',
    publicKey: TEST_FIREBLOCKS_PUBLIC_KEY,
    derivationPath: TEST_FIREBLOCKS_DERIVATION_PATH,
}

const TEST_AUTH_CONTEXT: AuthContext = {
    userId: 'test-user-id',
    accessToken: 'test-access-token',
}

const TEST_BAD_AUTH_CONTEXT: AuthContext = {
    userId: 'bad-user-id',
    accessToken: 'test-access-token',
}

jest.mock('./fireblocks', () => {
    const actual = jest.requireActual('./fireblocks')
    if (process.env.FIREBLOCKS_API_KEY) {
        return actual
    } else {
        return {
            // NOTE: beware that the mock's constructor is _not_ typesafe, if the constructor's first argument is changed,
            // the test will fail at runtime, not at compile time
            FireblocksHandler: jest
                .fn()
                .mockImplementation(
                    (defaultKey: FireblocksApiKeyInfo | undefined) => {
                        return {
                            constructor: jest.fn(),
                            getPublicKeys: jest
                                .fn()
                                .mockImplementation((userId: string) => {
                                    if (
                                        userId === TEST_AUTH_CONTEXT.userId ||
                                        defaultKey !== undefined
                                    ) {
                                        return [
                                            {
                                                name: TEST_KEY_NAME,
                                                publicKey:
                                                    TEST_FIREBLOCKS_PUBLIC_KEY,
                                                derivationPath: [
                                                    42,
                                                    CC_COIN_TYPE,
                                                    4,
                                                    0,
                                                    0,
                                                ],
                                                algorithm:
                                                    PublicKeyInformationAlgorithmEnum.EddsaEd25519,
                                            },
                                        ]
                                    } else {
                                        return {
                                            error: 'User not found',
                                            error_description:
                                                'User does not exist in Fireblocks',
                                        }
                                    }
                                }),
                            getTransactions: jest.fn(() => {
                                async function* generator() {
                                    yield FAKE_TRANSACTION
                                }
                                return generator()
                            }),
                            getTransaction: jest
                                .fn()
                                .mockResolvedValue(FAKE_TRANSACTION),
                            signTransaction: jest.fn().mockResolvedValue({
                                txId: TEST_TRANSACTION_HASH,
                                status: 'signed',
                            }),
                        }
                    }
                ),
        }
    }
})

interface TestValues {
    signingDriver: FireblocksSigningDriver
    key: CreateKeyResult
    controller: Methods
    noDefaultSigningDriver: FireblocksSigningDriver
}

export function throwWhenRpcError<T>(value: T | RpcError): void {
    if (isRpcError(value)) {
        throw new Error(
            `Expected a valid return, but got an error: ${value.error_description}`
        )
    }
}

async function setupTest(keyName: string = TEST_KEY_NAME): Promise<TestValues> {
    const apiKey = process.env.FIREBLOCKS_API_KEY
    const secretLocation =
        process.env.SECRET_KEY_LOCATION || 'fireblocks_secret.key'
    let keyInfo: FireblocksApiKeyInfo

    if (!apiKey) {
        keyInfo = {
            apiKey: 'mocked',
            apiSecret: 'mocked',
        }
    } else {
        const secretPath = path.resolve(process.cwd(), secretLocation)
        const apiSecret = readFileSync(secretPath, 'utf8')
        keyInfo = {
            apiKey,
            apiSecret,
        }
    }
    const userApiKeys = new Map<string, FireblocksApiKeyInfo>([
        [TEST_AUTH_CONTEXT.userId, keyInfo],
    ])
    const signingDriver = new FireblocksSigningDriver({
        defaultKeyInfo: keyInfo,
        userApiKeys,
    })
    const noDefaultSigningDriver = new FireblocksSigningDriver({
        defaultKeyInfo: undefined,
        userApiKeys,
    })
    const key = {
        id: TEST_FIREBLOCKS_VAULT_ID,
        name: keyName,
        publicKey: TEST_FIREBLOCKS_PUBLIC_KEY,
    }
    return {
        signingDriver,
        noDefaultSigningDriver,
        key,
        controller: signingDriver.controller(TEST_AUTH_CONTEXT.userId),
    }
}

test('key creation', async () => {
    const { controller } = await setupTest()
    const err = await controller.createKey({ name: 'test' })
    expect(isRpcError(err)).toBe(true)
})

test('non-existing user cannot use driver without a default', async () => {
    const { noDefaultSigningDriver } = await setupTest()
    const err = await noDefaultSigningDriver
        .controller(TEST_BAD_AUTH_CONTEXT.userId)
        .getKeys()
    expect(isRpcError(err)).toBe(true)
})

test('non-existing user can use driver that does have a default', async () => {
    const { signingDriver } = await setupTest()
    const keys = await signingDriver
        .controller(TEST_BAD_AUTH_CONTEXT.userId)
        .getKeys()
    expect(isRpcError(keys)).toBe(false)
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
