// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CC_COIN_TYPE } from '@canton-network/core-signing-lib'

const {
    mockGetPagedVaultAccounts,
    mockGetPublicKeyInfo,
    mockGetTransaction,
    mockGetTransactions,
    mockCreateTransaction,
} = vi.hoisted(() => ({
    mockGetPagedVaultAccounts: vi.fn(),
    mockGetPublicKeyInfo: vi.fn(),
    mockGetTransactions: vi.fn(),
    mockGetTransaction: vi.fn(),
    mockCreateTransaction: vi.fn(),
}))

vi.mock('@fireblocks/ts-sdk', () => ({
    Fireblocks: vi.fn(function Fireblocks() {
        return {
            vaults: {
                getPagedVaultAccounts: mockGetPagedVaultAccounts,
                getPublicKeyInfo: mockGetPublicKeyInfo,
            },
            transactions: {
                getTransaction: mockGetTransaction,
                getTransactions: mockGetTransactions,
                createTransaction: mockCreateTransaction,
            },
        }
    }),
    PublicKeyInformationAlgorithmEnum: {
        EddsaEd25519: 'EDDSA_ED25519',
    },
}))

import { FireblocksHandler } from './fireblocks.js'

const USER_ID = 'user-1'
const NOTE = 'Signing transaction'
const PUBLIC_KEY =
    '02fefbcc9aebc8a479f211167a9f564df53aefd603a8662d9449a98c1ead2eba'
const DERIVATION_PATH = [44, CC_COIN_TYPE, 4, 0, 0]
const TX_HASH =
    '88beb0783e394f6128699bad42906374ab64197d260db05bb0cfeeb518ba3ac2'

const API_KEY_INFO = { apiKey: 'api-key', apiSecret: 'api-secret' }

function createHandler(options?: {
    defaultKey?: typeof API_KEY_INFO
    userKeys?: Map<string, typeof API_KEY_INFO>
}) {
    return new FireblocksHandler(
        options?.defaultKey,
        options?.userKeys ?? new Map([[USER_ID, API_KEY_INFO]])
    )
}

function mockVaultPage(
    accounts: Array<{ id?: string; name?: string }>,
    after?: string
) {
    mockGetPagedVaultAccounts.mockResolvedValueOnce({
        data: {
            accounts,
            paging: after ? { after } : undefined,
        },
    })
}

function mockPublicKeyLookup(publicKey = PUBLIC_KEY) {
    mockGetPublicKeyInfo.mockResolvedValue({
        data: { publicKey },
    })
}

describe('FireblocksHandler', () => {
    beforeEach(() => {
        mockGetPagedVaultAccounts.mockReset()
        mockGetPublicKeyInfo.mockReset()
        mockGetTransaction.mockReset()
        mockGetTransactions.mockReset()
        mockCreateTransaction.mockReset()
        mockPublicKeyLookup()
    })

    it('throws when no client is available for the user', async () => {
        const handler = createHandler({
            userKeys: new Map(),
        })

        await expect(handler.getPublicKeys('unknown-user')).rejects.toThrow(
            'No Fireblocks client available for this user.'
        )
    })

    it('uses the default client when userId is not in the map', async () => {
        const handler = createHandler({
            defaultKey: API_KEY_INFO,
            userKeys: new Map(),
        })
        mockVaultPage([{ id: '4', name: 'vault-4' }])

        const keys = await handler.getPublicKeys('unknown-user')

        expect(keys).toHaveLength(1)
        expect(mockGetPagedVaultAccounts).toHaveBeenCalled()
    })

    it('paginates vault accounts and caches keys', async () => {
        const handler = createHandler()
        mockVaultPage([{ id: '4', name: 'vault-4' }], 'page-2')
        mockVaultPage([{ id: '5', name: 'vault-5' }])

        const keys = await handler.getPublicKeys(USER_ID)

        expect(keys).toHaveLength(2)
        expect(mockGetPagedVaultAccounts).toHaveBeenCalledTimes(2)
        expect(mockGetPagedVaultAccounts).toHaveBeenNthCalledWith(2, {
            after: 'page-2',
        })
    })

    it('skips vault accounts without an id', async () => {
        const handler = createHandler()
        mockVaultPage([{ name: 'no-id' }, { id: '4', name: 'vault-4' }])

        const keys = await handler.getPublicKeys(USER_ID)

        expect(keys).toHaveLength(1)
    })

    it('rethrows when listing vault accounts fails', async () => {
        const handler = createHandler()
        mockGetPagedVaultAccounts.mockRejectedValueOnce(
            new Error('vault error')
        )

        await expect(handler.getPublicKeys(USER_ID)).rejects.toThrow(
            'vault error'
        )
    })

    it('defaults to CC_COIN_TYPE in derivation path when coinType is not provided', async () => {
        const handler = createHandler()
        mockVaultPage([{ id: '4', name: 'vault-4' }])

        const keys = await handler.getPublicKeys(USER_ID)

        expect(keys[0].derivationPath[1]).toBe(CC_COIN_TYPE)
    })

    it('uses custom coinType in derivation path when provided', async () => {
        const handler = new FireblocksHandler(
            undefined,
            new Map([[USER_ID, API_KEY_INFO]]),
            'https://api.fireblocks.io/v1',
            1234
        )
        mockVaultPage([{ id: '4', name: 'vault-4' }])

        const keys = await handler.getPublicKeys(USER_ID)

        expect(keys[0].derivationPath[1]).toBe(1234)
    })

    it('returns undefined for getTransaction when the API fails', async () => {
        const handler = createHandler()
        mockGetTransaction.mockRejectedValueOnce(new Error('not found'))

        const tx = await handler.getTransaction(USER_ID, 'missing-tx')

        expect(tx).toBeUndefined()
    })

    it('formats a signed transaction from signedMessages', async () => {
        const handler = createHandler()
        mockGetTransaction.mockResolvedValueOnce({
            data: {
                id: 'tx-signed',
                createdAt: 1000,
                signedMessages: [
                    {
                        publicKey: PUBLIC_KEY,
                        content: 'content',
                        signature: { fullSig: 'sig-bytes' },
                        derivationPath: DERIVATION_PATH,
                    },
                ],
            },
        })

        const tx = await handler.getTransaction(USER_ID, 'tx-signed')

        expect(tx).toEqual({
            txId: 'tx-signed',
            status: 'signed',
            createdAt: 1000,
            publicKey: PUBLIC_KEY,
            signature: 'sig-bytes',
            derivationPath: DERIVATION_PATH,
        })
    })

    it('returns undefined when signedMessages are incomplete (through formatTransaction)', async () => {
        const handler = createHandler()
        mockGetTransaction.mockResolvedValueOnce({
            data: {
                id: 'tx-bad',
                signedMessages: [{ publicKey: PUBLIC_KEY }],
            },
        })

        const tx = await handler.getTransaction(USER_ID, 'tx-bad')

        expect(tx).toBeUndefined()
    })

    it('formats a pending transaction from raw message extra parameters', async () => {
        const handler = createHandler()
        mockGetTransaction.mockResolvedValueOnce({
            data: {
                id: 'tx-pending',
                createdAt: 2000,
                status: 'PENDING',
                extraParameters: {
                    rawMessageData: {
                        messages: [
                            {
                                content: TX_HASH,
                                derivationPath: DERIVATION_PATH,
                            },
                        ],
                        algorithm: 'EDDSA_ED25519',
                    },
                },
            },
        })

        const tx = await handler.getTransaction(USER_ID, 'tx-pending')

        expect(tx).toEqual({
            txId: 'tx-pending',
            status: 'pending',
            createdAt: 2000,
            publicKey: PUBLIC_KEY,
            derivationPath: DERIVATION_PATH,
        })
    })

    it.each([
        ['REJECTED', 'rejected'],
        ['BLOCKED', 'rejected'],
        ['CANCELLED', 'rejected'],
        ['FAILED', 'failed'],
    ])(
        'maps raw transaction status %s to %s',
        async (fireblocksStatus, expectedStatus) => {
            const handler = createHandler()
            mockGetTransaction.mockResolvedValueOnce({
                data: {
                    id: 'tx-status',
                    createdAt: 3000,
                    status: fireblocksStatus,
                    extraParameters: {
                        rawMessageData: {
                            messages: [
                                {
                                    content: TX_HASH,
                                    derivationPath: DERIVATION_PATH,
                                },
                            ],
                            algorithm: 'EDDSA_ED25519',
                        },
                    },
                },
            })

            const tx = await handler.getTransaction(USER_ID, 'tx-status')

            expect(tx?.status).toBe(expectedStatus)
        }
    )

    it('returns undefined when extraParameters cannot be parsed', async () => {
        const handler = createHandler()
        mockGetTransaction.mockResolvedValueOnce({
            data: {
                id: 'tx-invalid',
                extraParameters: { unexpected: true },
            },
        })

        const tx = await handler.getTransaction(USER_ID, 'tx-invalid')

        expect(tx).toBeUndefined()
    })

    it('reuses cached public keys for the same derivation path', async () => {
        const handler = createHandler()
        mockVaultPage([{ id: '4', name: 'vault-4' }])
        await handler.getPublicKeys(USER_ID)
        mockGetPublicKeyInfo.mockClear()

        mockGetTransaction.mockResolvedValueOnce({
            data: {
                id: 'tx-cached',
                createdAt: 4000,
                status: 'PENDING',
                extraParameters: {
                    rawMessageData: {
                        messages: [
                            {
                                content: TX_HASH,
                                derivationPath: DERIVATION_PATH,
                            },
                        ],
                        algorithm: 'EDDSA_ED25519',
                    },
                },
            },
        })

        await handler.getTransaction(USER_ID, 'tx-cached')

        expect(mockGetPublicKeyInfo).not.toHaveBeenCalled()
    })

    it('throws when public key lookup returns no publicKey', async () => {
        const handler = createHandler({
            defaultKey: API_KEY_INFO,
            userKeys: new Map(),
        })
        mockGetPublicKeyInfo.mockResolvedValue({ data: {} })
        mockVaultPage([{ id: '4', name: 'vault-4' }])

        await expect(handler.getPublicKeys(USER_ID)).rejects.toThrow(
            'Malformed public key response from Fireblocks'
        )
    })

    it('wraps public key lookup failures', async () => {
        const handler = createHandler()
        mockVaultPage([{ id: '4', name: 'vault-4' }])
        mockGetPublicKeyInfo.mockRejectedValue(new Error('network'))

        await expect(handler.getPublicKeys(USER_ID)).rejects.toThrow(
            'Error looking up public key'
        )
    })

    it('yields formatted transactions and skips unparseable entries', async () => {
        const handler = createHandler()
        mockGetTransactions.mockResolvedValueOnce({
            data: [
                {
                    id: 'good-tx',
                    createdAt: 5000,
                    status: 'COMPLETED',
                    signedMessages: [
                        {
                            publicKey: PUBLIC_KEY,
                            content: 'c',
                            signature: { fullSig: 'sig' },
                            derivationPath: DERIVATION_PATH,
                        },
                    ],
                },
                { id: 'bad-tx', extraParameters: { invalid: true } },
            ],
        })
        mockGetTransactions.mockResolvedValueOnce({ data: [] })

        const results = await Array.fromAsync(
            handler.getTransactions(USER_ID, { limit: 10 })
        )

        expect(results).toHaveLength(1)
        expect(results[0]?.txId).toBe('good-tx')
    })

    it('passes before to getTransactions when provided', async () => {
        const handler = createHandler()
        mockGetTransactions.mockResolvedValueOnce({ data: [] })

        await Array.fromAsync(
            handler.getTransactions(USER_ID, { before: 9999 })
        )

        expect(mockGetTransactions).toHaveBeenCalledWith(
            expect.objectContaining({ before: '9999' })
        )
    })

    it('rethrows when listing transactions fails', async () => {
        const handler = createHandler()
        mockGetTransactions.mockRejectedValueOnce(new Error('list failed'))

        await expect(async () => {
            await Array.fromAsync(handler.getTransactions(USER_ID))
        }).rejects.toThrow('list failed')
    })

    it('refreshes the key cache and signs a transaction', async () => {
        const handler = createHandler()
        mockVaultPage([{ id: '4', name: 'vault-4' }])
        mockCreateTransaction.mockResolvedValueOnce({
            data: { id: 'new-tx', status: 'COMPLETED' },
        })

        const tx = await handler.signTransaction(
            USER_ID,
            TX_HASH,
            { publicKey: PUBLIC_KEY },
            NOTE
        )

        expect(tx).toEqual({
            txId: 'new-tx',
            status: 'pending',
            publicKey: PUBLIC_KEY,
            derivationPath: DERIVATION_PATH,
        })
        expect(mockCreateTransaction).toHaveBeenCalledWith(
            expect.objectContaining({
                transactionRequest: expect.objectContaining({
                    operation: 'RAW',
                    note: NOTE,
                    externalTxId: undefined,
                    extraParameters: expect.objectContaining({
                        rawMessageData: expect.objectContaining({
                            messages: [
                                expect.objectContaining({
                                    content: TX_HASH,
                                    derivationPath: DERIVATION_PATH,
                                }),
                            ],
                        }),
                    }),
                }),
            })
        )
    })

    it('passes the note and externalTxId to Fireblocks', async () => {
        const handler = createHandler()
        mockVaultPage([{ id: '4', name: 'vault-4' }])
        mockCreateTransaction.mockResolvedValueOnce({
            data: { id: 'msg-tx', status: 'SUBMITTED' },
        })

        await handler.signTransaction(
            USER_ID,
            TX_HASH,
            { publicKey: PUBLIC_KEY },
            'Signing message with public key abc',
            'gateway-msg-1'
        )

        expect(mockCreateTransaction).toHaveBeenCalledWith(
            expect.objectContaining({
                transactionRequest: expect.objectContaining({
                    note: 'Signing message with public key abc',
                    externalTxId: 'gateway-msg-1',
                }),
            })
        )
    })

    it.each([
        ['COMPLETED', 'pending'],
        ['SUBMITTED', 'pending'],
        ['REJECTED', 'rejected'],
        ['CANCELLED', 'failed'],
        ['FAILED', 'failed'],
        ['BLOCKED', 'failed'],
    ])(
        'maps createTransaction status %s to %s',
        async (fireblocksStatus, expectedStatus) => {
            const handler = createHandler()
            mockVaultPage([{ id: '4', name: 'vault-4' }])
            mockCreateTransaction.mockResolvedValueOnce({
                data: { id: 'status-tx', status: fireblocksStatus },
            })

            const tx = await handler.signTransaction(
                USER_ID,
                TX_HASH,
                { publicKey: PUBLIC_KEY },
                NOTE
            )

            expect(tx.status).toBe(expectedStatus)
        }
    )

    it('throws when signing without a public key', async () => {
        const handler = createHandler()

        await expect(
            handler.signTransaction(USER_ID, TX_HASH, { id: 'key-id' }, NOTE)
        ).rejects.toThrow(
            'Public key is required for Fireblocks signing provider'
        )
    })

    it('throws when the public key is not found in vaults', async () => {
        const handler = createHandler()
        mockVaultPage([])

        await expect(
            handler.signTransaction(
                USER_ID,
                TX_HASH,
                { publicKey: 'unknown-key' },
                NOTE
            )
        ).rejects.toThrow('Public key unknown-key not found in vaults')
    })

    it('rethrows when createTransaction fails', async () => {
        const handler = createHandler()
        mockVaultPage([{ id: '4', name: 'vault-4' }])
        mockCreateTransaction.mockRejectedValueOnce(new Error('sign failed'))

        await expect(
            handler.signTransaction(
                USER_ID,
                TX_HASH,
                { publicKey: PUBLIC_KEY },
                NOTE
            )
        ).rejects.toThrow('sign failed')
    })
})
