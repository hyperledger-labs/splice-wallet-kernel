// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'

import FireblocksSigningDriver from './index.js'

import {
    isRpcError,
    type Transaction,
    CC_COIN_TYPE,
    type Key,
    type Error as RpcError,
} from '@canton-network/core-signing-lib'
import { PublicKeyInformationAlgorithmEnum } from '@fireblocks/ts-sdk'
import type { AuthContext } from '@canton-network/core-wallet-auth'
import type {
    FireblocksApiKeyInfo,
    FireblocksTransaction,
} from './fireblocks.js'

const TEST_KEY_NAME = 'test-key-name'
const TEST_TRANSACTION = 'test-tx'
const TEST_TRANSACTION_HASH =
    '88beb0783e394f6128699bad42906374ab64197d260db05bb0cfeeb518ba3ac2'

const TEST_FIREBLOCKS_DERIVATION_PATH = [42, CC_COIN_TYPE, 4, 0, 0]
const TEST_FIREBLOCKS_VAULT_ID = TEST_FIREBLOCKS_DERIVATION_PATH.join('-')
const TEST_FIREBLOCKS_PUBLIC_KEY =
    '02fefbcc9aebc8a479f211167a9f564df53aefd603a8662d9449a98c1ead2eba'

const TEST_KEY: Key = {
    id: TEST_FIREBLOCKS_VAULT_ID,
    name: TEST_KEY_NAME,
    publicKey: TEST_FIREBLOCKS_PUBLIC_KEY,
}

const FAKE_TRANSACTION: FireblocksTransaction = {
    txId: TEST_TRANSACTION_HASH,
    status: 'signed',
    signature: 'deadbeef',
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

const fireblocksHandlerMock = vi.hoisted(() => ({
    getPublicKeys: vi.fn(),
    getTransactions: vi.fn(),
    getTransaction: vi.fn(),
    signTransaction: vi.fn(),
}))

vi.mock('./fireblocks.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./fireblocks.js')>()
    return {
        ...actual,
        FireblocksHandler: vi.fn(function FireblocksHandler() {
            return fireblocksHandlerMock
        }),
    }
})

function mockHandlerDefaults() {
    fireblocksHandlerMock.getPublicKeys.mockResolvedValue([
        {
            name: TEST_KEY_NAME,
            publicKey: TEST_FIREBLOCKS_PUBLIC_KEY,
            derivationPath: TEST_FIREBLOCKS_DERIVATION_PATH,
            algorithm: PublicKeyInformationAlgorithmEnum.EddsaEd25519,
        },
    ])
    fireblocksHandlerMock.getTransactions.mockImplementation(
        async function* () {
            yield FAKE_TRANSACTION
        }
    )
    fireblocksHandlerMock.getTransaction.mockResolvedValue(FAKE_TRANSACTION)
    fireblocksHandlerMock.signTransaction.mockResolvedValue({
        txId: TEST_TRANSACTION_HASH,
        status: 'pending',
        publicKey: TEST_FIREBLOCKS_PUBLIC_KEY,
        derivationPath: TEST_FIREBLOCKS_DERIVATION_PATH,
    })
}

interface TestValues {
    signingDriver: FireblocksSigningDriver
    key: Key
    controller: ReturnType<FireblocksSigningDriver['controller']>
    noDefaultSigningDriver: FireblocksSigningDriver
}

// For satisfying TS when resonse type is a union of Error | Something
function throwWhenRpcError<T>(value: T | RpcError): asserts value is T {
    if (isRpcError(value)) {
        throw new Error(
            `Expected a valid return, but got an error: ${value.error_description}`
        )
    }
}

async function setupTest(keyName: string = TEST_KEY_NAME): Promise<TestValues> {
    const keyInfo: FireblocksApiKeyInfo = {
        apiKey: 'mocked',
        apiSecret: 'mocked',
    }
    const userApiKeys = new Map<string, FireblocksApiKeyInfo>([
        [TEST_AUTH_CONTEXT.userId, keyInfo],
    ])
    const signingDriver = new FireblocksSigningDriver({
        defaultKeyInfo: keyInfo,
        userApiKeys,
    })
    const noDefaultSigningDriver = new FireblocksSigningDriver({
        userApiKeys,
    })
    return {
        signingDriver,
        noDefaultSigningDriver,
        key: { ...TEST_KEY, name: keyName },
        controller: signingDriver.controller(TEST_AUTH_CONTEXT.userId),
    }
}

describe('FireblocksSigningDriver', () => {
    beforeEach(() => {
        mockHandlerDefaults()
    })

    it('key creation returns not_allowed', async () => {
        const { controller } = await setupTest()
        const result = await controller.createKey({ name: 'test' })
        const isError = isRpcError(result)
        expect(isError).toBe(true)
        if (isError) {
            expect(result.error).toBe('not_allowed')
        }
    })

    it('non-existing user cannot use driver without a default', async () => {
        const { noDefaultSigningDriver } = await setupTest()
        fireblocksHandlerMock.getPublicKeys.mockRejectedValueOnce(
            new Error('User does not exist in Fireblocks')
        )
        const result = await noDefaultSigningDriver
            .controller(TEST_BAD_AUTH_CONTEXT.userId)
            .getKeys()
        expect(isRpcError(result)).toBe(true)
        if (isRpcError(result)) {
            expect(result.error).toBe('fetch_error')
        }
    })

    it('non-existing user can use driver that does have a default', async () => {
        const { signingDriver } = await setupTest()
        const keys = await signingDriver
            .controller(TEST_BAD_AUTH_CONTEXT.userId)
            .getKeys()
        throwWhenRpcError(keys)
        expect(keys.keys).toHaveLength(1)
    })

    it('signMessage sends the UTF-8 message as hex and returns pending until Fireblocks signs', async () => {
        const { controller } = await setupTest()
        const message = 'header.payload'

        const result = await controller.signMessage({
            message,
            keyIdentifier: { publicKey: TEST_KEY.publicKey },
            internalTxId: 'msg-1',
        })

        throwWhenRpcError(result)
        const hexPublicKey = Buffer.from(TEST_KEY.publicKey, 'base64').toString(
            'hex'
        )
        expect(fireblocksHandlerMock.signTransaction).toHaveBeenLastCalledWith(
            TEST_AUTH_CONTEXT.userId,
            Buffer.from(message, 'utf8').toString('hex'),
            { publicKey: hexPublicKey },
            `Signing message with public key ${hexPublicKey}`,
            'msg-1'
        )
        expect(result).toEqual({
            txId: TEST_TRANSACTION_HASH,
            status: 'pending',
        })
    })

    it('signMessage returns key_not_found without a public key', async () => {
        const { controller } = await setupTest()
        fireblocksHandlerMock.signTransaction.mockClear()
        const result = await controller.signMessage({
            message: 'hello',
            keyIdentifier: { id: 'vault' },
        })

        expect(result).toEqual({
            error: 'key_not_found',
            error_description:
                'The provided key identifier must include a publicKey.',
        })
        expect(fireblocksHandlerMock.signTransaction).not.toHaveBeenCalled()
    })

    it('signMessage returns bad_arguments for an empty message', async () => {
        const { controller } = await setupTest()
        fireblocksHandlerMock.signTransaction.mockClear()
        const result = await controller.signMessage({
            message: '',
            keyIdentifier: { publicKey: TEST_KEY.publicKey },
        })

        expect(result).toEqual({
            error: 'bad_arguments',
            error_description:
                'A non-empty message is required to sign with Fireblocks.',
        })
        expect(fireblocksHandlerMock.signTransaction).not.toHaveBeenCalled()
    })

    it('signMessage returns signing_error when handler throws', async () => {
        const { controller } = await setupTest()
        fireblocksHandlerMock.signTransaction.mockRejectedValueOnce(
            new Error('Fireblocks down')
        )

        const result = await controller.signMessage({
            message: 'hello',
            keyIdentifier: { publicKey: TEST_KEY.publicKey },
        })

        expect(result).toEqual({
            error: 'signing_error',
            error_description: 'Fireblocks down',
        })
    })

    it('signTransaction returns signing_error when Fireblocks throws', async () => {
        const { controller } = await setupTest()
        fireblocksHandlerMock.signTransaction.mockRejectedValueOnce(
            new Error('sign failed')
        )

        const result = await controller.signTransaction({
            tx: TEST_TRANSACTION,
            txHash: TEST_TRANSACTION_HASH,
            keyIdentifier: { publicKey: TEST_KEY.publicKey },
        })

        expect(result).toEqual({
            error: 'signing_error',
            error_description: 'sign failed',
        })
    })

    it('getTransaction returns transaction_not_found when missing', async () => {
        const { controller } = await setupTest()
        fireblocksHandlerMock.getTransaction.mockResolvedValueOnce(undefined)

        const result = await controller.getTransaction({
            txId: 'missing',
        })

        expect(result).toEqual({
            error: 'transaction_not_found',
            error_description: 'The requested transaction does not exist.',
        })
    })

    it('getTransaction omits optional fields when not returned', async () => {
        const { controller } = await setupTest()
        fireblocksHandlerMock.getTransaction.mockResolvedValueOnce({
            txId: 'tx-1',
            status: 'pending',
            derivationPath: TEST_FIREBLOCKS_DERIVATION_PATH,
        })

        const result = await controller.getTransaction({ txId: 'tx-1' })
        throwWhenRpcError(result)

        expect(result).toEqual({
            txId: 'tx-1',
            status: 'pending',
        })
    })

    it('getTransaction includes signature and publicKey when returned', async () => {
        const { controller } = await setupTest()

        const result = await controller.getTransaction({
            txId: TEST_TRANSACTION_HASH,
        })
        throwWhenRpcError(result)

        // the fireblocks driver should return the signature + publicKey in base64 format
        expect(result).toEqual({
            txId: TEST_TRANSACTION_HASH,
            status: 'signed',
            signature: Buffer.from('deadbeef', 'hex').toString('base64'),
            publicKey: Buffer.from(TEST_FIREBLOCKS_PUBLIC_KEY, 'hex').toString(
                'base64'
            ),
        })
    })

    it('getTransactions returns bad_arguments when filters are missing', async () => {
        const { controller } = await setupTest()
        const result = await controller.getTransactions({})
        expect(result).toEqual({
            error: 'bad_arguments',
            error_description: 'either public key or txIds must be supplied',
        })
    })

    it('getTransactions returns fetch_error when listing fails', async () => {
        const { controller } = await setupTest()
        fireblocksHandlerMock.getPublicKeys.mockImplementationOnce(() => {
            throw new Error('fetch failed')
        })

        const result = await controller.getKeys()
        expect(result).toEqual({
            error: 'fetch_error',
            error_description: 'fetch failed',
        })
    })

    it('signs a transaction', async () => {
        const { controller } = await setupTest()
        const tx = await controller.signTransaction({
            tx: TEST_TRANSACTION,
            txHash: TEST_TRANSACTION_HASH,
            keyIdentifier: { publicKey: TEST_KEY.publicKey },
        })
        throwWhenRpcError(tx)
        expect(tx.status).toBe('pending')
        expect(tx.signature).toBeUndefined()
        const hexPublicKey = Buffer.from(TEST_KEY.publicKey, 'base64').toString(
            'hex'
        )
        expect(fireblocksHandlerMock.signTransaction).toHaveBeenLastCalledWith(
            TEST_AUTH_CONTEXT.userId,
            Buffer.from(TEST_TRANSACTION_HASH, 'base64').toString('hex'),
            { publicKey: hexPublicKey },
            `Signing transaction with public key ${hexPublicKey}`,
            undefined
        )

        const transactionsByKey = await controller.getTransactions({
            publicKeys: [TEST_KEY.publicKey],
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

        const foundTx = await controller.getTransaction({ txId: tx.txId })
        throwWhenRpcError(foundTx)
    })

    it('stops early when filtering only by txIds and all are found', async () => {
        const { controller } = await setupTest()
        let callCount = 0
        fireblocksHandlerMock.getTransactions.mockImplementation(
            async function* () {
                callCount += 1
                yield {
                    txId: 'only-tx',
                    status: 'signed',
                    publicKey: TEST_FIREBLOCKS_PUBLIC_KEY,
                    derivationPath: TEST_FIREBLOCKS_DERIVATION_PATH,
                }
                yield FAKE_TRANSACTION
            }
        )

        const result = await controller.getTransactions({
            txIds: ['only-tx'],
        })
        throwWhenRpcError(result)
        expect(result.transactions).toHaveLength(1)
        expect(callCount).toBe(1)
    })

    it('updates config', async () => {
        const { controller } = await setupTest()
        const newPath = 'https://api.example/v1'

        const config = await controller.getConfiguration()
        throwWhenRpcError(config)
        await controller.setConfiguration({
            ...config,
            apiPath: newPath,
        })

        const newConfig = await controller.getConfiguration()
        throwWhenRpcError(newConfig)
        expect(newConfig.apiPath).toBe(newPath)
    })

    it('includes coinType in configuration when provided', async () => {
        const keyInfo: FireblocksApiKeyInfo = {
            apiKey: 'mocked',
            apiSecret: 'mocked',
        }
        const signingDriver = new FireblocksSigningDriver({
            defaultKeyInfo: keyInfo,
            userApiKeys: new Map([[TEST_AUTH_CONTEXT.userId, keyInfo]]),
            coinType: 1234,
        })

        const config = await signingDriver
            .controller(TEST_AUTH_CONTEXT.userId)
            .getConfiguration()
        throwWhenRpcError(config)

        expect(config.coinType).toBe(1234)
    })

    it('setConfiguration returns bad_arguments for invalid config', async () => {
        const { controller } = await setupTest()
        const result = await controller.setConfiguration({ invalid: true })
        expect(isRpcError(result)).toBe(true)
        if (isRpcError(result)) {
            expect(result.error).toBe('bad_arguments')
        }
    })
})
