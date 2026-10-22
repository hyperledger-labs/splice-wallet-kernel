// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
    isRpcError,
    type Error as RpcError,
    type KeyIdentifier,
} from '@canton-network/core-signing-lib'
import BitGoSigningDriver from './index.js'
import type { BitGoConfig, BitGoTransaction } from './bitgo.js'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const WALLET_ID = 'test-wallet-aabbcc'
const TX_REQUEST_ID = 'aaaabbbb-cccc-dddd-eeee-ffffffffffff'
const FINGERPRINT =
    '12206::122066c3b0ed7e4879579d53a0f04cabf54895fc4b410877adf88e61b68999b6e38d'

const SIGNED_TX: BitGoTransaction = {
    txId: TX_REQUEST_ID,
    status: 'signed',
    signature:
        'RCS+Qh5w9VHk6Ih14jYTBcTB30RG5arj3ZmUr8mSTO7N6+zNPrJdXHUL13zE3LGfVDqvLEI76PKOczC5EL3OAw==',
    publicKey: WALLET_ID,
    metadata: { signedBy: FINGERPRINT },
}

// ─── Handler mock ─────────────────────────────────────────────────────────────

const handlerMock = vi.hoisted(() => ({
    createKey: vi.fn(),
    signTransaction: vi.fn(),
    getTransaction: vi.fn(),
    getTransactions: vi.fn(),
    fetchTxRequest: vi.fn(),
    getKeys: vi.fn(),
    getWalletId: vi.fn(),
}))

vi.mock('./bitgo.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./bitgo.js')>()
    return {
        ...actual,
        BitGoHandler: vi.fn(function BitGoHandler() {
            return handlerMock
        }),
    }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function throwWhenRpcError<T>(value: T | RpcError): asserts value is T {
    if (isRpcError(value)) {
        throw new Error(
            `Expected success but got RPC error: ${value.error_description}`
        )
    }
}

const defaultConfig: BitGoConfig = {
    accessToken: 'v2xtest-token',
    baseUrl: 'https://app.bitgo-test.com',
    enterpriseId: 'ent-123',
    coin: 'tcanton',
}

function createDriver(config: BitGoConfig = defaultConfig) {
    return new BitGoSigningDriver(config)
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('BitGoSigningDriver', () => {
    beforeEach(() => {
        // Sensible defaults — individual tests override as needed.
        handlerMock.createKey.mockResolvedValue({
            id: WALLET_ID,
            name: 'my-key',
            publicKey: 'xzDk3KeB9HUXg7kt1gPdEJhzJM7vFynqAtrLreWtDfY=',
        })
        handlerMock.getWalletId.mockReturnValue(WALLET_ID)
        handlerMock.signTransaction.mockResolvedValue({ txId: TX_REQUEST_ID })
        handlerMock.getTransaction.mockResolvedValue(SIGNED_TX)
        handlerMock.getTransactions.mockImplementation(async function* () {
            yield SIGNED_TX
        })
        handlerMock.getKeys.mockResolvedValue([
            {
                id: WALLET_ID,
                name: 'my-key',
                publicKey: 'xzDk3KeB9HUXg7kt1gPdEJhzJM7vFynqAtrLreWtDfY=',
            },
        ])
    })

    // ── static properties ──────────────────────────────────────────────────

    it('has partyMode=external and signingProvider=bitgo', () => {
        const driver = createDriver()
        expect(driver.partyMode).toBe('external')
        expect(driver.signingProvider).toBe('bitgo')
    })

    // ── signMessage ────────────────────────────────────────────────────────

    describe('signMessage', () => {
        it('returns not_allowed', async () => {
            const result = await createDriver()
                .controller(undefined)
                .signMessage({
                    message: 'test',
                    keyIdentifier: { id: WALLET_ID },
                })
            expect(isRpcError(result)).toBe(true)
            if (isRpcError(result)) expect(result.error).toBe('not_allowed')
        })
    })

    // ── createKey ──────────────────────────────────────────────────────────

    describe('createKey', () => {
        it('returns key with derived Ed25519 publicKey', async () => {
            const result = await createDriver()
                .controller(undefined)
                .createKey({ name: 'my-key' })
            throwWhenRpcError(result)
            expect(result).toEqual({
                id: WALLET_ID,
                name: 'my-key',
                publicKey: 'xzDk3KeB9HUXg7kt1gPdEJhzJM7vFynqAtrLreWtDfY=',
            })
            expect(handlerMock.createKey).toHaveBeenCalledWith('my-key')
        })

        it('returns create_key_error when enterpriseId is missing', async () => {
            handlerMock.createKey.mockRejectedValueOnce(
                new Error('enterpriseId is required')
            )
            const result = await createDriver({
                accessToken: 'v2xtest-token',
                baseUrl: 'https://app.bitgo-test.com',
                coin: 'tcanton',
            })
                .controller(undefined)
                .createKey({ name: 'fail' })
            expect(isRpcError(result)).toBe(true)
            if (isRpcError(result))
                expect(result.error).toBe('create_key_error')
        })

        it('returns create_key_error when handler throws', async () => {
            handlerMock.createKey.mockRejectedValueOnce(
                new Error('BitGo API 422')
            )
            const result = await createDriver()
                .controller(undefined)
                .createKey({ name: 'fail' })
            expect(isRpcError(result)).toBe(true)
            if (isRpcError(result)) {
                expect(result.error).toBe('create_key_error')
                expect(result.error_description).toContain('BitGo API 422')
            }
        })
    })

    // ── signTransaction ────────────────────────────────────────────────────

    describe('signTransaction', () => {
        it('returns pending immediately after submit', async () => {
            const result = await createDriver()
                .controller(undefined)
                .signTransaction({
                    tx: 'base64tx==',
                    txHash: 'base64hash==',
                    keyIdentifier: { id: WALLET_ID },
                })
            throwWhenRpcError(result)
            expect(result.txId).toBe(TX_REQUEST_ID)
            expect(result.status).toBe('pending')
        })

        it('passes walletId from keyIdentifier.id to handler', async () => {
            await createDriver()
                .controller(undefined)
                .signTransaction({
                    tx: 'tx',
                    txHash: 'hash',
                    keyIdentifier: { id: WALLET_ID },
                })
            expect(handlerMock.signTransaction).toHaveBeenCalledWith(
                expect.objectContaining({ walletId: WALLET_ID })
            )
        })

        it('resolves Ed25519 publicKey to walletId via keyMap when id is absent', async () => {
            const result = await createDriver()
                .controller(undefined)
                .signTransaction({
                    tx: 'tx',
                    txHash: 'hash',
                    keyIdentifier: {
                        publicKey:
                            'xzDk3KeB9HUXg7kt1gPdEJhzJM7vFynqAtrLreWtDfY=',
                    },
                })
            throwWhenRpcError(result)
            expect(handlerMock.getWalletId).toHaveBeenCalledWith(
                'xzDk3KeB9HUXg7kt1gPdEJhzJM7vFynqAtrLreWtDfY='
            )
            expect(handlerMock.signTransaction).toHaveBeenCalledWith(
                expect.objectContaining({ walletId: WALLET_ID })
            )
        })

        it('returns key_not_found when publicKey is not in keyMap even after getKeys() refresh', async () => {
            // First lookup misses; getKeys() refreshes; second lookup still misses.
            handlerMock.getWalletId.mockReturnValueOnce(undefined)
            handlerMock.getKeys.mockResolvedValueOnce([])
            handlerMock.getWalletId.mockReturnValueOnce(undefined)
            const result = await createDriver()
                .controller(undefined)
                .signTransaction({
                    tx: 'tx',
                    txHash: 'hash',
                    keyIdentifier: { publicKey: 'unknown-key' },
                })
            expect(isRpcError(result)).toBe(true)
            if (isRpcError(result)) expect(result.error).toBe('key_not_found')
            expect(handlerMock.getKeys).toHaveBeenCalledOnce()
        })

        it('resolves walletId via getKeys() refresh on cold start', async () => {
            // Simulate restart: first keyMap lookup misses, getKeys() repopulates, second hits.
            handlerMock.getWalletId.mockReturnValueOnce(undefined)
            handlerMock.getKeys.mockResolvedValueOnce([])
            handlerMock.getWalletId.mockReturnValueOnce(WALLET_ID)
            const result = await createDriver()
                .controller(undefined)
                .signTransaction({
                    tx: 'tx',
                    txHash: 'hash',
                    keyIdentifier: {
                        publicKey:
                            'xzDk3KeB9HUXg7kt1gPdEJhzJM7vFynqAtrLreWtDfY=',
                    },
                })
            expect(isRpcError(result)).toBe(false)
            expect(handlerMock.getKeys).toHaveBeenCalledOnce()
            expect(handlerMock.signTransaction).toHaveBeenCalledWith(
                expect.objectContaining({ walletId: WALLET_ID })
            )
        })

        it('returns key_not_found when keyIdentifier has neither id nor publicKey', async () => {
            handlerMock.getWalletId.mockReturnValueOnce(undefined)
            const result = await createDriver()
                .controller(undefined)
                .signTransaction({
                    tx: 'tx',
                    txHash: 'hash',
                    // deliberately invalid: neither id nor publicKey
                    keyIdentifier: {} as KeyIdentifier,
                })
            expect(isRpcError(result)).toBe(true)
            if (isRpcError(result)) expect(result.error).toBe('key_not_found')
        })

        it('returns signing_error when handler throws', async () => {
            handlerMock.signTransaction.mockRejectedValueOnce(
                new Error('TSS failed')
            )
            const result = await createDriver()
                .controller(undefined)
                .signTransaction({
                    tx: 'tx',
                    txHash: 'hash',
                    keyIdentifier: { id: WALLET_ID },
                })
            expect(isRpcError(result)).toBe(true)
            if (isRpcError(result)) {
                expect(result.error).toBe('signing_error')
                expect(result.error_description).toContain('TSS failed')
            }
        })
    })

    // ── getTransaction ─────────────────────────────────────────────────────

    describe('getTransaction', () => {
        it('returns txId, status, signature, publicKey, and metadata.signedBy', async () => {
            const result = await createDriver()
                .controller(undefined)
                .getTransaction({ txId: TX_REQUEST_ID })
            throwWhenRpcError(result)
            expect(result.txId).toBe(TX_REQUEST_ID)
            expect(result.status).toBe('signed')
            expect(result.signature).toBe(SIGNED_TX.signature)
            expect(result.publicKey).toBe(WALLET_ID)
            expect(result.metadata?.signedBy).toBe(FINGERPRINT)
        })

        it('omits signature, publicKey, and metadata when absent', async () => {
            handlerMock.getTransaction.mockResolvedValueOnce({
                txId: TX_REQUEST_ID,
                status: 'pending',
                publicKey: WALLET_ID,
            })
            const result = await createDriver()
                .controller(undefined)
                .getTransaction({ txId: TX_REQUEST_ID })
            throwWhenRpcError(result)
            expect(result.signature).toBeUndefined()
            expect(result.metadata).toBeUndefined()
        })

        it('returns transaction_not_found when handler returns undefined', async () => {
            handlerMock.getTransaction.mockResolvedValueOnce(undefined)
            const result = await createDriver()
                .controller(undefined)
                .getTransaction({ txId: 'ghost' })
            expect(isRpcError(result)).toBe(true)
            if (isRpcError(result))
                expect(result.error).toBe('transaction_not_found')
        })

        it('returns fetch_error when handler throws', async () => {
            handlerMock.getTransaction.mockRejectedValueOnce(
                new Error('network error')
            )
            const result = await createDriver()
                .controller(undefined)
                .getTransaction({ txId: TX_REQUEST_ID })
            expect(isRpcError(result)).toBe(true)
            if (isRpcError(result)) expect(result.error).toBe('fetch_error')
        })
    })

    // ── getTransactions ────────────────────────────────────────────────────

    describe('getTransactions', () => {
        it('returns bad_arguments when no filters supplied', async () => {
            const result = await createDriver()
                .controller(undefined)
                .getTransactions({})
            expect(isRpcError(result)).toBe(true)
            if (isRpcError(result)) expect(result.error).toBe('bad_arguments')
        })

        it('returns transactions by publicKey (walletId)', async () => {
            const result = await createDriver()
                .controller(undefined)
                .getTransactions({ publicKeys: [WALLET_ID] })
            throwWhenRpcError(result)
            expect(result.transactions).toHaveLength(1)
            const tx = result.transactions![0]
            expect(tx.txId).toBe(TX_REQUEST_ID)
            expect(tx.signature).toBe(SIGNED_TX.signature)
            expect(tx.metadata?.signedBy).toBe(FINGERPRINT)
        })

        it('returns transactions by txIds', async () => {
            const result = await createDriver()
                .controller(undefined)
                .getTransactions({ txIds: [TX_REQUEST_ID] })
            throwWhenRpcError(result)
            expect(result.transactions).toHaveLength(1)
            expect(result.transactions![0].txId).toBe(TX_REQUEST_ID)
        })

        it('stops consuming generator after all txIds are found', async () => {
            let reachedSecondYield = false
            handlerMock.getTransactions.mockImplementation(async function* () {
                yield {
                    txId: TX_REQUEST_ID,
                    status: 'signed',
                    publicKey: WALLET_ID,
                }
                reachedSecondYield = true
                yield {
                    txId: 'extra-tx',
                    status: 'pending',
                    publicKey: WALLET_ID,
                }
            })

            const result = await createDriver()
                .controller(undefined)
                .getTransactions({ txIds: [TX_REQUEST_ID] })
            throwWhenRpcError(result)
            expect(result.transactions).toHaveLength(1)
            expect(reachedSecondYield).toBe(false)
        })

        it('does not stop early when publicKeys is also supplied', async () => {
            handlerMock.getTransactions.mockImplementation(async function* () {
                yield {
                    txId: TX_REQUEST_ID,
                    status: 'signed',
                    publicKey: WALLET_ID,
                }
                yield {
                    txId: 'extra-tx',
                    status: 'pending',
                    publicKey: WALLET_ID,
                }
            })

            const result = await createDriver()
                .controller(undefined)
                .getTransactions({
                    txIds: [TX_REQUEST_ID],
                    publicKeys: [WALLET_ID],
                })
            throwWhenRpcError(result)
            expect(result.transactions).toHaveLength(2)
        })

        it('deduplicates when the same txId appears in both txIds and publicKeys scans', async () => {
            handlerMock.getTransactions.mockImplementation(async function* () {
                yield {
                    txId: TX_REQUEST_ID,
                    status: 'signed',
                    publicKey: WALLET_ID,
                }
                // Same txId again (simulating publicKeys scan returning same tx)
                yield {
                    txId: TX_REQUEST_ID,
                    status: 'signed',
                    publicKey: WALLET_ID,
                }
            })

            const result = await createDriver()
                .controller(undefined)
                .getTransactions({
                    txIds: [TX_REQUEST_ID],
                    publicKeys: [WALLET_ID],
                })
            throwWhenRpcError(result)
            expect(result.transactions).toHaveLength(1)
        })

        it('returns fetch_error when generator throws', async () => {
            handlerMock.getTransactions.mockImplementation(async function* () {
                throw new Error('stream failed')
                // oxlint-disable-next-line no-unreachable -- makes this a generator
                yield SIGNED_TX
            })

            const result = await createDriver()
                .controller(undefined)
                .getTransactions({ txIds: [TX_REQUEST_ID] })
            expect(isRpcError(result)).toBe(true)
            if (isRpcError(result)) expect(result.error).toBe('fetch_error')
        })
    })

    // ── getKeys ────────────────────────────────────────────────────────────

    describe('getKeys', () => {
        it('returns list of keys', async () => {
            const result = await createDriver().controller(undefined).getKeys()
            throwWhenRpcError(result)
            expect(result.keys).toHaveLength(1)
            expect(result.keys![0]).toEqual({
                id: WALLET_ID,
                name: 'my-key',
                publicKey: 'xzDk3KeB9HUXg7kt1gPdEJhzJM7vFynqAtrLreWtDfY=',
            })
        })

        it('returns fetch_error when handler throws', async () => {
            handlerMock.getKeys.mockRejectedValueOnce(new Error('auth failed'))
            const result = await createDriver().controller(undefined).getKeys()
            expect(isRpcError(result)).toBe(true)
            if (isRpcError(result)) expect(result.error).toBe('fetch_error')
        })
    })

    // ── getConfiguration ──────────────────────────────────────────────────

    describe('getConfiguration', () => {
        it('hides access token', async () => {
            const result = await createDriver()
                .controller(undefined)
                .getConfiguration()
            throwWhenRpcError(result)
            expect((result as Record<string, unknown>).accessToken).toBe(
                '***HIDDEN***'
            )
        })

        it('returns baseUrl, enterpriseId, and coin', async () => {
            const result = await createDriver()
                .controller(undefined)
                .getConfiguration()
            throwWhenRpcError(result)
            const config = result as Record<string, unknown>
            expect(config.baseUrl).toBe('https://app.bitgo-test.com')
            expect(config.enterpriseId).toBe('ent-123')
            expect(config.coin).toBe('tcanton')
        })

        it('reflects coin after setConfiguration updates it', async () => {
            const driver = createDriver()
            const controller = driver.controller(undefined)
            await controller.setConfiguration({ coin: 'canton' })
            const config = await controller.getConfiguration()
            throwWhenRpcError(config)
            expect((config as Record<string, unknown>).coin).toBe('canton')
        })
    })

    // ── setConfiguration ──────────────────────────────────────────────────

    describe('setConfiguration', () => {
        it('updates baseUrl and returns new config', async () => {
            const driver = createDriver()
            const controller = driver.controller(undefined)

            await controller.setConfiguration({
                baseUrl: 'https://app.bitgo.com',
            })

            const config = await controller.getConfiguration()
            throwWhenRpcError(config)
            expect((config as Record<string, unknown>).baseUrl).toBe(
                'https://app.bitgo.com'
            )
        })

        it('updates enterpriseId', async () => {
            const driver = createDriver()
            const controller = driver.controller(undefined)

            await controller.setConfiguration({ enterpriseId: 'new-ent' })

            const config = await controller.getConfiguration()
            throwWhenRpcError(config)
            expect((config as Record<string, unknown>).enterpriseId).toBe(
                'new-ent'
            )
        })

        it('rebuilds handler after config update', async () => {
            const { BitGoHandler } = await import('./bitgo.js')
            const callsBefore = (BitGoHandler as ReturnType<typeof vi.fn>).mock
                .calls.length

            await createDriver()
                .controller(undefined)
                .setConfiguration({ coin: 'canton' })
            const callsAfter = (BitGoHandler as ReturnType<typeof vi.fn>).mock
                .calls.length

            expect(callsAfter).toBeGreaterThan(callsBefore)
        })

        it('preserves existing config fields not included in partial update', async () => {
            const driver = createDriver()
            const controller = driver.controller(undefined)
            // Update only coin — enterpriseId should remain 'ent-123'
            await controller.setConfiguration({ coin: 'canton' })
            const config = await controller.getConfiguration()
            throwWhenRpcError(config)
            expect((config as Record<string, unknown>).enterpriseId).toBe(
                'ent-123'
            )
            expect((config as Record<string, unknown>).coin).toBe('canton')
        })

        it.each([
            ['accessToken', ''],
            ['enterpriseId', ''],
            ['coin', ''],
            ['baseUrl', 'not-a-url'],
        ])('returns bad_arguments for invalid %s', async (field, value) => {
            const result = await createDriver()
                .controller(undefined)
                .setConfiguration({ [field]: value })
            expect(isRpcError(result)).toBe(true)
            if (isRpcError(result)) expect(result.error).toBe('bad_arguments')
        })
    })
})
