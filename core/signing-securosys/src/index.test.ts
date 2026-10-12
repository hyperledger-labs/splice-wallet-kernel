// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, type Mocked, vi } from 'vitest'
import type { Key, Transaction } from '@canton-network/core-signing-lib'
import SecurosysSigningDriver, { SECUROSYS_SIGNING_PROVIDER } from './index.js'
import type { SigningAPIClient } from './signing-api-sdk.js'

describe('SecurosysSigningDriver constructor', () => {
    it('uses the securosys provider string', () => {
        const driver = new SecurosysSigningDriver({
            baseUrl: 'http://localhost:8080',
        })

        expect(driver.signingProvider).toBe(SECUROSYS_SIGNING_PROVIDER)
        expect(driver.signingProvider).toBe('securosys')
    })

    it('passes config to the client', () => {
        const driver = new SecurosysSigningDriver({
            baseUrl: 'http://localhost:8080/',
            keyOperationApiKey: 'operation',
        })
        const client = (driver as unknown as { client: SigningAPIClient })
            .client

        expect(client.getConfiguration()).toMatchObject({
            BaseURL: 'http://localhost:8080',
            KeyOperationApiKey: 'operation',
        })
    })
})

describe('SecurosysSigningDriver', () => {
    const userId = 'wallet-user'

    let driver: SecurosysSigningDriver
    let mockClient: Mocked<SigningAPIClient>

    beforeEach(() => {
        mockClient = {
            signTransaction: vi.fn(),
            signMessage: vi.fn(),
            getTransaction: vi.fn(),
            getTransactions: vi.fn(),
            getKeys: vi.fn(),
            createKey: vi.fn(),
            cancelTransaction: vi.fn(),
            getKeyAttributes: vi.fn(),
            getConfiguration: vi.fn().mockReturnValue({
                BaseURL: 'http://localhost:8080',
                KeyManagementApiKey: 'key-secret',
                KeyOperationApiKey: 'operation-secret',
                BearerToken: 'bearer-secret',
                MtlsP12Path: '/certs/client.p12',
                MtlsP12Password: 'mtls-secret',
                KeyPassword: 'password-secret',
                SignatureAlgorithm: 'EDDSA',
            }),
            setConfiguration: vi.fn(),
        } as unknown as Mocked<SigningAPIClient>

        driver = new SecurosysSigningDriver({
            baseUrl: 'http://localhost:8080',
        })
        ;(driver as unknown as { client: SigningAPIClient }).client = mockClient
    })

    it('signTransaction calls the client with userIdentifier', async () => {
        mockClient.signTransaction.mockResolvedValue({
            txId: 'tsb-request-id',
            status: 'pending',
            publicKey: 'public-key',
            metadata: { tsbStatus: 'PENDING' },
        } as Transaction)

        const result = await driver.controller(userId).signTransaction({
            tx: 'tx',
            txHash: 'hash',
            keyIdentifier: { id: 'key-name' },
            internalTxId: 'wallet-tx-id',
        })

        expect(mockClient.signTransaction).toHaveBeenCalledWith({
            tx: 'tx',
            txHash: 'hash',
            keyIdentifier: { id: 'key-name' },
            internalTxId: 'wallet-tx-id',
            userIdentifier: userId,
        })
        expect(result).toEqual({
            txId: 'tsb-request-id',
            status: 'pending',
            publicKey: 'public-key',
            metadata: { tsbStatus: 'PENDING' },
        })
    })

    it('signTransaction requires id or publicKey', async () => {
        const result = await driver.controller(userId).signTransaction({
            tx: 'tx',
            txHash: 'hash',
            keyIdentifier: {} as never,
        })

        expect(result).toEqual({
            error: 'key_not_found',
            error_description:
                'The provided key identifier must include an id or publicKey.',
        })
        expect(mockClient.signTransaction).not.toHaveBeenCalled()
    })

    it('signTransaction returns signing_error when the client throws', async () => {
        mockClient.signTransaction.mockRejectedValue(new Error('TSB down'))

        const result = await driver.controller(userId).signTransaction({
            tx: 'tx',
            txHash: 'hash',
            keyIdentifier: { publicKey: 'pk' },
        })

        expect(result).toEqual({
            error: 'signing_error',
            error_description: 'TSB down',
        })
    })

    it('signMessage submits the message and returns pending', async () => {
        mockClient.signMessage.mockResolvedValue({
            txId: 'tsb-request-id',
            status: 'pending',
            publicKey: 'public-key',
        } as Transaction)

        const result = await driver.controller(userId).signMessage({
            message: 'hello',
            keyIdentifier: { id: 'key' },
        })

        expect(mockClient.signMessage).toHaveBeenCalledWith({
            message: 'hello',
            keyIdentifier: { id: 'key' },
            userIdentifier: userId,
        })
        expect(result).toEqual({
            txId: 'tsb-request-id',
            status: 'pending',
        })
    })

    it('signMessage includes a signature when the client returns one', async () => {
        mockClient.signMessage.mockResolvedValue({
            txId: 'tsb-request-id',
            status: 'signed',
            signature: 'signature',
        } as Transaction)

        const result = await driver.controller(userId).signMessage({
            message: 'hello',
            keyIdentifier: { id: 'key' },
        })

        expect(result).toEqual({
            txId: 'tsb-request-id',
            status: 'signed',
            signature: 'signature',
        })
    })

    it('signMessage requires a message', async () => {
        const result = await driver.controller(userId).signMessage({
            message: '',
            keyIdentifier: { id: 'key' },
        })

        expect(result).toEqual({
            error: 'bad_arguments',
            error_description: 'message is required to sign with Securosys.',
        })
        expect(mockClient.signMessage).not.toHaveBeenCalled()
    })

    it('signMessage requires id or publicKey', async () => {
        const result = await driver.controller(userId).signMessage({
            message: 'hello',
            keyIdentifier: {} as never,
        })

        expect(result).toEqual({
            error: 'key_not_found',
            error_description:
                'The provided key identifier must include an id or publicKey.',
        })
        expect(mockClient.signMessage).not.toHaveBeenCalled()
    })

    it('signMessage returns signing_error when the client throws', async () => {
        mockClient.signMessage.mockRejectedValue(new Error('TSB down'))

        const result = await driver.controller(userId).signMessage({
            message: 'hello',
            keyIdentifier: { id: 'key' },
        })

        expect(result).toEqual({
            error: 'signing_error',
            error_description: 'TSB down',
        })
    })

    it('getTransaction maps client transactions', async () => {
        mockClient.getTransaction.mockResolvedValue({
            txId: 'req-1',
            status: 'signed',
            signature: 'signature',
            publicKey: 'public-key',
            metadata: { tsbStatus: 'EXECUTED' },
        } as Transaction)

        const result = await driver
            .controller(userId)
            .getTransaction({ txId: 'req-1' })

        expect(result).toEqual({
            txId: 'req-1',
            status: 'signed',
            signature: 'signature',
            publicKey: 'public-key',
            metadata: { tsbStatus: 'EXECUTED' },
        })
    })

    it('getTransaction returns transaction_not_found when the client throws', async () => {
        mockClient.getTransaction.mockRejectedValue(new Error('not found'))

        const result = await driver
            .controller(userId)
            .getTransaction({ txId: 'missing' })

        expect(result).toEqual({
            error: 'transaction_not_found',
            error_description: 'not found',
        })
    })

    it('getTransactions requires filters', async () => {
        const result = await driver.controller(userId).getTransactions({})

        expect(result).toEqual({
            error: 'bad_arguments',
            error_description: 'either public key or txIds must be supplied',
        })
        expect(mockClient.getTransactions).not.toHaveBeenCalled()
    })

    it('getTransactions returns mapped transactions', async () => {
        mockClient.getTransactions.mockResolvedValue([
            {
                txId: 'req-1',
                status: 'signed',
                signature: 'signature',
            },
        ] as Transaction[])

        const result = await driver
            .controller(userId)
            .getTransactions({ txIds: ['req-1'] })

        expect(mockClient.getTransactions).toHaveBeenCalledWith({
            txIds: ['req-1'],
            publicKeys: undefined,
        })
        expect(result).toEqual({
            transactions: [
                {
                    txId: 'req-1',
                    status: 'signed',
                    signature: 'signature',
                },
            ],
        })
    })

    it('getTransactions returns fetch_error when the client throws', async () => {
        mockClient.getTransactions.mockRejectedValue(new Error('TSB down'))

        const result = await driver
            .controller(userId)
            .getTransactions({ txIds: ['req-1'] })

        expect(result).toEqual({
            error: 'fetch_error',
            error_description: 'TSB down',
        })
    })

    it('getKeys attaches the Wallet Gateway user identifier', async () => {
        mockClient.getKeys.mockResolvedValue([
            {
                id: 'key-1',
                name: 'key-1',
                publicKey: 'public-key',
            },
        ] as Key[])

        const result = await driver.controller(userId).getKeys()

        expect(result).toEqual({
            keys: [
                {
                    id: 'key-1',
                    name: 'key-1',
                    publicKey: 'public-key',
                    userIdentifier: userId,
                },
            ],
        })
    })

    it('getKeys returns fetch_error when the client throws', async () => {
        mockClient.getKeys.mockRejectedValue(new Error('TSB down'))

        const result = await driver.controller(userId).getKeys()

        expect(result).toEqual({
            error: 'fetch_error',
            error_description: 'TSB down',
        })
    })

    it('createKey forwards user-scoped params to the client', async () => {
        mockClient.createKey.mockResolvedValue({
            id: 'new-key',
            name: 'new-key',
            publicKey: 'public-key',
        } as Key)

        const result = await driver
            .controller(userId)
            .createKey({ name: 'new-key' })

        expect(mockClient.createKey).toHaveBeenCalledWith({
            name: 'new-key',
            userIdentifier: userId,
        })
        expect(result).toEqual({
            id: 'new-key',
            name: 'new-key',
            publicKey: 'public-key',
        })
    })

    it('createKey returns create_key_error when the client throws', async () => {
        mockClient.createKey.mockRejectedValue(new Error('TSB down'))

        const result = await driver
            .controller(userId)
            .createKey({ name: 'new-key' })

        expect(result).toEqual({
            error: 'create_key_error',
            error_description: 'TSB down',
        })
    })

    it('getConfiguration masks secrets', async () => {
        const result = await driver.controller(userId).getConfiguration()

        expect(result).toMatchObject({
            BaseURL: 'http://localhost:8080',
            KeyManagementApiKey: '***HIDDEN***',
            KeyOperationApiKey: '***HIDDEN***',
            BearerToken: '***HIDDEN***',
            MtlsP12Path: '/certs/client.p12',
            MtlsP12Password: '***HIDDEN***',
            KeyPassword: '***HIDDEN***',
            SignatureAlgorithm: 'EDDSA',
        })
        expect(result).not.toHaveProperty('CreateKeyRequest')
        expect(result).not.toHaveProperty('SignatureType')
        expect(result).not.toHaveProperty('PayloadType')
        expect(result).not.toHaveProperty('PublicKeyFormat')
    })

    it('setConfiguration forwards supported fields', async () => {
        const params = {
            BaseURL: 'https://tsb.example',
            KeyManagementApiKey: 'key',
            KeyOperationApiKey: 'operation',
            BearerToken: 'token',
            MtlsP12Path: '/certs/client.p12',
            MtlsP12Password: 'mtls-secret',
            KeyPassword: 'secret',
            SignatureAlgorithm: 'SHA256_WITH_ECDSA',
            CreateKeyRequest: { algorithm: 'EC' },
        }
        mockClient.setConfiguration.mockReturnValue({
            BaseURL: 'https://tsb.example',
            KeyManagementApiKey: 'key',
            KeyOperationApiKey: 'operation',
            BearerToken: 'token',
            MtlsP12Path: '/certs/client.p12',
            MtlsP12Password: 'mtls-secret',
            KeyPassword: 'secret',
            SignatureAlgorithm: 'SHA256_WITH_ECDSA',
        })

        const result = await driver.controller(userId).setConfiguration(params)

        expect(mockClient.setConfiguration).toHaveBeenCalledWith({
            BaseURL: 'https://tsb.example',
            KeyManagementApiKey: 'key',
            KeyOperationApiKey: 'operation',
            BearerToken: 'token',
            MtlsP12Path: '/certs/client.p12',
            MtlsP12Password: 'mtls-secret',
            KeyPassword: 'secret',
            SignatureAlgorithm: 'SHA256_WITH_ECDSA',
        })
        expect(result).toEqual({
            BaseURL: 'https://tsb.example',
            SignatureAlgorithm: 'SHA256_WITH_ECDSA',
            KeyManagementApiKey: '***HIDDEN***',
            KeyOperationApiKey: '***HIDDEN***',
            BearerToken: '***HIDDEN***',
            MtlsP12Path: '/certs/client.p12',
            MtlsP12Password: '***HIDDEN***',
            KeyPassword: '***HIDDEN***',
        })
        expect(result).not.toHaveProperty('CreateKeyRequest')
    })

    it('subscribeTransactions is a no-op', async () => {
        await expect(
            driver.controller(userId).subscribeTransactions({} as never)
        ).resolves.toEqual({})
    })
})
