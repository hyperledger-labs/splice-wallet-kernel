// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    type Mocked,
    vi,
} from 'vitest'
import type { Key, Transaction } from '@canton-network/core-signing-lib'
import SecurosysSigningDriver, { SECUROSYS_SIGNING_PROVIDER } from './index.js'
import type { SigningAPIClient } from './signing-api-sdk.js'

// Raw Ed25519 public key whose base64 form contains '+', '/' and '=' padding,
// so the derived TSB label differs from the public key.
const walletPublicKey = Buffer.alloc(32, 0xfb).toString('base64')
const walletKeyLabel = walletPublicKey
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

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

    it('signTransaction derives the key label when only a public key is supplied', async () => {
        mockClient.signTransaction.mockResolvedValue({
            txId: 'tsb-request-id',
            status: 'pending',
        } as Transaction)

        await driver.controller(userId).signTransaction({
            tx: 'tx',
            txHash: 'hash',
            keyIdentifier: { publicKey: walletPublicKey },
        })

        expect(mockClient.signTransaction).toHaveBeenCalledWith({
            tx: 'tx',
            txHash: 'hash',
            keyIdentifier: { id: walletKeyLabel, publicKey: walletPublicKey },
            userIdentifier: userId,
        })
    })

    it('signTransaction preserves an explicit key id', async () => {
        mockClient.signTransaction.mockResolvedValue({
            txId: 'tsb-request-id',
            status: 'pending',
        } as Transaction)

        await driver.controller(userId).signTransaction({
            tx: 'tx',
            txHash: 'hash',
            keyIdentifier: { id: 'custom-label', publicKey: walletPublicKey },
        })

        expect(mockClient.signTransaction).toHaveBeenCalledWith({
            tx: 'tx',
            txHash: 'hash',
            keyIdentifier: { id: 'custom-label', publicKey: walletPublicKey },
            userIdentifier: userId,
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

    it('signMessage is explicitly unsupported', async () => {
        const result = await driver.controller(userId).signMessage({
            message: 'hello',
            keyIdentifier: { id: 'key' },
        })

        expect(result).toEqual({
            error: 'not_allowed',
            error_description:
                'Signing messages is not supported by the Securosys TSB signing driver.',
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

describe('SecurosysSigningDriver public-key signing against TSB', () => {
    let fetchMock: ReturnType<typeof vi.fn>

    beforeEach(() => {
        fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    function jsonResponse(body: unknown): Response {
        return new Response(JSON.stringify(body), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })
    }

    function requestsTo(endpoint: string): RequestInit[] {
        return fetchMock.mock.calls
            .filter((call) => String(call[0]).endsWith(endpoint))
            .map((call) => call[1] as RequestInit)
    }

    it('looks up the derived label and signs with the matching key', async () => {
        fetchMock
            .mockResolvedValueOnce(
                jsonResponse({
                    json: { label: walletKeyLabel, publicKey: walletPublicKey },
                })
            )
            .mockResolvedValueOnce(jsonResponse({ signRequestId: 'req-1' }))
        const driver = new SecurosysSigningDriver({
            baseUrl: 'http://tsb.example',
        })

        const result = await driver.controller('wallet-user').signTransaction({
            tx: 'tx',
            txHash: 'hash',
            keyIdentifier: { publicKey: walletPublicKey },
        })

        expect(result).toMatchObject({
            txId: 'req-1',
            status: 'pending',
            publicKey: walletPublicKey,
        })
        expect(requestsTo('/v1/key')).toHaveLength(0)
        const attributeRequests = requestsTo('/v1/key/attributes')
        expect(attributeRequests).toHaveLength(1)
        expect(JSON.parse(attributeRequests[0]!.body as string)).toMatchObject({
            label: walletKeyLabel,
        })
        const signRequests = requestsTo('/v1/sign')
        expect(signRequests).toHaveLength(1)
        expect(
            JSON.parse(signRequests[0]!.body as string).signRequest.signKeyName
        ).toBe(walletKeyLabel)
    })

    it('rejects a derived label whose key does not match the supplied public key', async () => {
        const otherPublicKey = Buffer.alloc(32, 1).toString('base64')
        fetchMock.mockResolvedValueOnce(
            jsonResponse({
                json: { label: walletKeyLabel, publicKey: otherPublicKey },
            })
        )
        const driver = new SecurosysSigningDriver({
            baseUrl: 'http://tsb.example',
        })

        const result = await driver.controller('wallet-user').signTransaction({
            tx: 'tx',
            txHash: 'hash',
            keyIdentifier: { publicKey: walletPublicKey },
        })

        expect(result).toEqual({
            error: 'signing_error',
            error_description: `TSB key '${walletKeyLabel}' public key does not match the provided keyIdentifier publicKey`,
        })
        expect(requestsTo('/v1/sign')).toHaveLength(0)
    })
})
