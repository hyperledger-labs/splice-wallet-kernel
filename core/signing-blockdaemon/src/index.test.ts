// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { vi, expect, describe, test, beforeEach, type Mocked } from 'vitest'
import BlockdaemonSigningDriver from './index.js'
import type { SigningAPIClient } from './signing-api-sdk.js'
import type { Transaction, Key } from '@canton-network/core-signing-lib'

describe('BlockdaemonSigningDriver constructor', () => {
    test('passes caip2 from config to the client', () => {
        const driver = new BlockdaemonSigningDriver({
            baseUrl: 'http://localhost:9999',
            apiKey: 'key',
            caip2: 'canton:testnet',
        })
        const client = (driver as unknown as { client: SigningAPIClient })
            .client
        expect(client.getConfiguration().CAIP2).toBe('canton:testnet')
    })

    test('defaults to canton:devnet when caip2 not provided', () => {
        const driver = new BlockdaemonSigningDriver({
            baseUrl: 'http://localhost:9999',
            apiKey: 'key',
        })
        const client = (driver as unknown as { client: SigningAPIClient })
            .client
        expect(client.getConfiguration().CAIP2).toBe('canton:devnet')
    })
})

describe('BlockdaemonSigningDriver', () => {
    const config = {
        baseUrl: 'http://localhost:3000',
        apiKey: 'test-api-key',
    }
    const userId = 'test-user-id'

    let driver: BlockdaemonSigningDriver
    let mockClient: Mocked<SigningAPIClient>

    beforeEach(() => {
        mockClient = {
            signTransaction: vi.fn(),
            getTransaction: vi.fn(),
            getTransactions: vi.fn(),
            getKeys: vi.fn(),
            createKey: vi.fn(),
            getConfiguration: vi.fn().mockReturnValue({
                BaseURL: 'http://localhost:3000',
                ApiKey: 'secret',
                MasterKey: 'Default',
                CAIP2: 'canton:devnet',
            }),
            setConfiguration: vi.fn(),
        } as unknown as Mocked<SigningAPIClient>

        driver = new BlockdaemonSigningDriver(config)

        // test-only escape hatch to inject mock client
        ;(driver as unknown as { client: SigningAPIClient }).client = mockClient
    })

    test('signTransaction calls client.signTransaction with correct params', async () => {
        const signParams = {
            tx: 'tx-bytes',
            txHash: 'tx-hash',
            keyIdentifier: { publicKey: 'some-public-key' },
            internalTxId: 'internal-id',
        }

        const mockResponse = {
            txId: 'tx-id',
            status: 'signed',
            signature: 'signature-bytes',
            publicKey: 'some-public-key',
            metadata: {
                ErrorCode: 'M0025',
                ErrorProperties: {
                    DebugMessage:
                        'eval policy evaluate: M0025 blocked by rule/restriction',
                },
            },
        }

        mockClient.signTransaction.mockResolvedValue(
            mockResponse as Transaction
        )

        const result = await driver
            .controller(userId)
            .signTransaction(signParams)

        expect(mockClient.signTransaction).toHaveBeenCalledWith({
            tx: signParams.tx,
            txHash: signParams.txHash,
            keyIdentifier: signParams.keyIdentifier,
            internalTxId: signParams.internalTxId,
            userIdentifier: userId,
        })

        expect(result).toEqual({
            txId: mockResponse.txId,
            status: mockResponse.status,
            signature: mockResponse.signature,
            publicKey: mockResponse.publicKey,
            metadata: mockResponse.metadata,
        })
    })

    test('createKey calls client.createKey with correct params', async () => {
        const createKeyParams = {
            name: 'new-key',
        }

        const mockResponse = {
            id: 'key-id',
            name: 'new-key',
            publicKey: 'new-public-key',
        }

        mockClient.createKey.mockResolvedValue(mockResponse as Key)

        const result = await driver
            .controller(userId)
            .createKey(createKeyParams)

        expect(mockClient.createKey).toHaveBeenCalledWith({
            name: createKeyParams.name,
            userIdentifier: userId,
        })

        expect(result).toEqual({
            id: mockResponse.id,
            name: mockResponse.name,
            publicKey: mockResponse.publicKey,
        })
    })

    test('getTransaction calls client.getTransaction with correct params', async () => {
        const getTransactionParams = { txId: 'tx-id' }

        mockClient.getTransaction.mockResolvedValue({
            txId: 'tx-id',
            status: 'signed',
        } as Transaction)

        await driver.controller(userId).getTransaction(getTransactionParams)

        expect(mockClient.getTransaction).toHaveBeenCalledWith({
            txId: getTransactionParams.txId,
        })
    })

    test('getTransaction omits optional fields when not returned', async () => {
        mockClient.getTransaction.mockResolvedValue({
            txId: 'tx-1',
            status: 'pending',
        } as Transaction)

        const result = await driver
            .controller(userId)
            .getTransaction({ txId: 'tx-1' })

        expect(result).toEqual({
            txId: 'tx-1',
            status: 'pending',
        })
    })

    test('getTransaction includes signature, publicKey, and metadata when returned', async () => {
        mockClient.getTransaction.mockResolvedValue({
            txId: 'tx-1',
            status: 'signed',
            signature: 'signature-bytes',
            publicKey: 'some-public-key',
            metadata: { code: 'meta' },
        } as Transaction)

        const result = await driver
            .controller(userId)
            .getTransaction({ txId: 'tx-1' })

        expect(result).toEqual({
            txId: 'tx-1',
            status: 'signed',
            signature: 'signature-bytes',
            publicKey: 'some-public-key',
            metadata: { code: 'meta' },
        })
    })

    test('getTransactions calls client.getTransactions with correct params', async () => {
        const getTransactionsParams = {
            txIds: ['tx-id-1', 'tx-id-2'],
            publicKeys: ['pk-1'],
        }

        const mockResponse = [
            {
                txId: 'tx-id-1',
                status: 'signed',
                signature: 'sig-1',
                publicKey: 'pk-1',
            },
            {
                txId: 'tx-id-2',
                status: 'pending',
                signature: 'sig-2',
                publicKey: 'pk-1',
            },
        ]

        mockClient.getTransactions.mockResolvedValue(
            mockResponse as Transaction[]
        )

        const result = await driver
            .controller(userId)
            .getTransactions(getTransactionsParams)

        expect(mockClient.getTransactions).toHaveBeenCalledWith({
            txIds: getTransactionsParams.txIds,
            publicKeys: getTransactionsParams.publicKeys,
            userIdentifier: userId,
        })

        expect(result).toEqual({
            transactions: mockResponse.map((tx) => ({
                txId: tx.txId,
                status: tx.status,
                signature: tx.signature,
                publicKey: tx.publicKey,
            })),
        })
    })

    test('getKeys calls client.getKeys with correct params', async () => {
        const mockResponse = [
            {
                id: 'key-1',
                name: 'Key 1',
                publicKey: 'pk-1',
            },
            {
                id: 'key-2',
                name: 'Key 2',
                publicKey: 'pk-2',
            },
        ]

        mockClient.getKeys.mockResolvedValue(mockResponse as Key[])

        const result = await driver.controller(userId).getKeys()

        expect(mockClient.getKeys).toHaveBeenCalled()

        expect(result).toEqual({
            keys: mockResponse.map((k) => ({
                id: k.id,
                name: k.name,
                publicKey: k.publicKey,
                userIdentifier: userId,
            })),
        })
    })

    test('signTransaction returns key_not_found when publicKey is missing', async () => {
        const result = await driver.controller(userId).signTransaction({
            tx: 'tx',
            txHash: 'hash',
            keyIdentifier: { id: 'keyIdentifier.id is not implemented yet' },
        })

        expect(result).toEqual({
            error: 'key_not_found',
            error_description:
                'The provided key identifier must include a publicKey.',
        })
        expect(mockClient.signTransaction).not.toHaveBeenCalled()
    })

    test('signTransaction returns signing_error when the client throws', async () => {
        mockClient.signTransaction.mockRejectedValue(new Error('sign failed'))

        const result = await driver.controller(userId).signTransaction({
            tx: 'tx',
            txHash: 'hash',
            keyIdentifier: { publicKey: 'pk' },
        })

        expect(result).toEqual({
            error: 'signing_error',
            error_description: 'sign failed',
        })
    })

    test('signTransaction omits internalTxId when not provided', async () => {
        mockClient.signTransaction.mockResolvedValue({
            txId: 'tx-1',
            status: 'pending',
        } as Transaction)

        await driver.controller(userId).signTransaction({
            tx: 'tx',
            txHash: 'hash',
            keyIdentifier: { publicKey: 'pk' },
        })

        expect(mockClient.signTransaction).toHaveBeenCalledWith({
            tx: 'tx',
            txHash: 'hash',
            keyIdentifier: { publicKey: 'pk' },
            userIdentifier: userId,
        })
    })

    test('getTransaction returns transaction_not_found when the client throws', async () => {
        mockClient.getTransaction.mockRejectedValue(new Error('not found'))

        const result = await driver
            .controller(userId)
            .getTransaction({ txId: 'missing' })

        expect(result).toEqual({
            error: 'transaction_not_found',
            error_description: 'not found',
        })
    })

    test('getTransactions returns correct payload for signed tx', async () => {
        mockClient.getTransactions.mockResolvedValue([
            { txId: 'tx-1', status: 'signed' },
        ] as Transaction[])

        const result = await driver.controller(userId).getTransactions({
            txIds: ['tx-1'],
        })

        expect(result).toEqual({
            transactions: [{ txId: 'tx-1', status: 'signed' }],
        })
    })

    test('getTransactions includes metadata when present', async () => {
        mockClient.getTransactions.mockResolvedValue([
            {
                txId: 'tx-1',
                status: 'failed',
                metadata: { reason: 'rejected' },
            },
        ] as Transaction[])

        const result = await driver.controller(userId).getTransactions({
            publicKeys: ['pk-1'],
        })

        expect(result).toEqual({
            transactions: [
                {
                    txId: 'tx-1',
                    status: 'failed',
                    metadata: { reason: 'rejected' },
                },
            ],
        })
    })

    test('getTransactions returns bad_arguments when filters are missing', async () => {
        const result = await driver.controller(userId).getTransactions({})

        expect(result).toEqual({
            error: 'bad_arguments',
            error_description: 'either public key or txIds must be supplied',
        })
        expect(mockClient.getTransactions).not.toHaveBeenCalled()
    })

    test('getTransactions returns fetch_error when the client throws', async () => {
        mockClient.getTransactions.mockRejectedValue(new Error('fetch failed'))

        const result = await driver.controller(userId).getTransactions({
            txIds: ['tx-1'],
        })

        expect(result).toEqual({
            error: 'fetch_error',
            error_description: 'fetch failed',
        })
    })

    test('getKeys returns fetch_error when the client throws', async () => {
        mockClient.getKeys.mockRejectedValue(new Error('keys failed'))

        const result = await driver.controller(userId).getKeys()

        expect(result).toEqual({
            error: 'fetch_error',
            error_description: 'keys failed',
        })
    })

    test('createKey returns create_key_error when the client throws', async () => {
        mockClient.createKey.mockRejectedValue(new Error('create failed'))

        const result = await driver
            .controller(userId)
            .createKey({ name: 'new-key' })

        expect(result).toEqual({
            error: 'create_key_error',
            error_description: 'create failed',
        })
    })

    test('getConfiguration masks sensitive fields', async () => {
        const result = await driver.controller(userId).getConfiguration()

        expect(result).toEqual({
            BaseURL: 'http://localhost:3000',
            ApiKey: '***HIDDEN***',
            MasterKey: '***HIDDEN***',
            CAIP2: 'canton:devnet',
        })
    })

    test('getConfiguration leaves ApiKey and MasterKey undefined when unset', async () => {
        mockClient.getConfiguration.mockReturnValue({
            BaseURL: 'http://localhost:3000',
            CAIP2: 'canton:devnet',
        })

        const result = await driver.controller(userId).getConfiguration()

        expect(result.ApiKey).toBeUndefined()
        expect(result.MasterKey).toBeUndefined()
    })

    test('setConfiguration forwards params to the client', async () => {
        const params = {
            BaseURL: 'https://api.example',
            ApiKey: 'new-key',
            MasterKey: 'Master',
            Caip2: 'canton:mainnet' as const,
        }

        const result = await driver.controller(userId).setConfiguration(params)

        expect(mockClient.setConfiguration).toHaveBeenCalledWith({
            BaseURL: 'https://api.example',
            ApiKey: 'new-key',
            MasterKey: 'Master',
            Caip2: 'canton:mainnet',
        })
        expect(result).toEqual(params)
    })
})
