// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { jest, expect, describe, test, beforeEach } from '@jest/globals'
import BlockdaemonSigningDriver from './index.js'
import { SigningAPIClient } from './signing-api-sdk.js'
import { Transaction, Key } from '@canton-network/core-signing-lib'

describe('BlockdaemonSigningDriver', () => {
    const config = {
        baseUrl: 'http://localhost:3000',
        apiKey: 'test-api-key',
    }
    const userId = 'test-user-id'

    let driver: BlockdaemonSigningDriver
    let mockClient: jest.Mocked<SigningAPIClient>

    beforeEach(() => {
        jest.clearAllMocks()

        mockClient = {
            signTransaction: jest.fn(),
            getTransaction: jest.fn(),
            getTransactions: jest.fn(),
            getKeys: jest.fn(),
            createKey: jest.fn(),
            getConfiguration: jest.fn(),
            setConfiguration: jest.fn(),
        } as unknown as jest.Mocked<SigningAPIClient>

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
        const getTransactionParams = {
            txId: 'tx-id',
        }

        const mockResponse = {
            txId: 'tx-id',
            status: 'signed',
            signature: 'signature-bytes',
            publicKey: 'some-public-key',
        }

        mockClient.getTransaction.mockResolvedValue(mockResponse as Transaction)

        const result = await driver
            .controller(userId)
            .getTransaction(getTransactionParams)

        expect(mockClient.getTransaction).toHaveBeenCalledWith({
            txId: getTransactionParams.txId,
            userIdentifier: userId,
        })

        expect(result).toEqual({
            txId: mockResponse.txId,
            status: mockResponse.status,
            signature: mockResponse.signature,
            publicKey: mockResponse.publicKey,
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
})
