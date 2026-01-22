// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { jest, expect, describe, test, beforeEach } from '@jest/globals'
import BlockdaemonSigningDriver from './index.js'
import { SigningAPIClient } from './signing-api-sdk.js'
import { Transaction } from '@canton-network/core-signing-lib'

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
        } as unknown as jest.Mocked<SigningAPIClient>

        driver = new BlockdaemonSigningDriver(config)
        driver.setClient(mockClient)
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
})
