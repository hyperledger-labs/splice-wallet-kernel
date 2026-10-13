// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, test, vi } from 'vitest'

import { DfnsHandler, type DfnsCredentials } from './dfns.js'

const ORG_ID = 'or-test-org'
const BASE_URL = 'https://api.dfns.io'

const ED25519_PUB_HEX = `0x${'ab'.repeat(32)}`
const ED25519_PUB_B64 = Buffer.from('ab'.repeat(32), 'hex').toString('base64')

const KEY_ID = 'key-test-1'
const SIG_ID = 'sig-test-1'

const TEST_CREDENTIALS: DfnsCredentials = {
    credId: 'cred-1',
    privateKey:
        '-----BEGIN EC PRIVATE KEY-----\ntest\n-----END EC PRIVATE KEY-----',
    authToken: 'test-auth-token',
}

const dfnsKeysMock = vi.hoisted(() => ({
    createKey: vi.fn(),
    listKeys: vi.fn(),
    getKey: vi.fn(),
    generateSignature: vi.fn(),
    getSignature: vi.fn(),
    listSignatures: vi.fn(),
}))

vi.mock('@dfns/sdk-keysigner', () => ({
    AsymmetricKeySigner: vi.fn(),
}))

vi.mock('@dfns/sdk', () => ({
    DfnsApiClient: vi.fn(function DfnsApiClient() {
        return { keys: dfnsKeysMock }
    }),
}))

import { AsymmetricKeySigner } from '@dfns/sdk-keysigner'
import { DfnsApiClient } from '@dfns/sdk'

function createHandler() {
    return new DfnsHandler(ORG_ID, BASE_URL, TEST_CREDENTIALS)
}

function activeDfnsKey(overrides: Record<string, unknown> = {}) {
    return {
        id: KEY_ID,
        name: 'canton-key',
        status: 'Active',
        scheme: 'EdDSA',
        curve: 'ed25519',
        publicKey: ED25519_PUB_HEX,
        ...overrides,
    }
}

describe('DfnsHandler', () => {
    beforeEach(() => {})

    test('constructs Dfns client with org, base URL, and asymmetric signer', () => {
        createHandler()

        expect(AsymmetricKeySigner).toHaveBeenCalledWith({
            credId: TEST_CREDENTIALS.credId,
            privateKey: TEST_CREDENTIALS.privateKey,
        })
        expect(DfnsApiClient).toHaveBeenCalledWith({
            orgId: ORG_ID,
            authToken: TEST_CREDENTIALS.authToken,
            baseUrl: BASE_URL,
            signer: expect.anything(),
        })
    })

    describe('createKey', () => {
        test('creates an ed25519 key and maps the public key to base64', async () => {
            dfnsKeysMock.createKey.mockResolvedValue({
                id: KEY_ID,
                name: 'my-key',
                publicKey: ED25519_PUB_HEX,
            })

            const key = await createHandler().createKey('my-key')

            expect(dfnsKeysMock.createKey).toHaveBeenCalledWith({
                body: { scheme: 'EdDSA', curve: 'ed25519', name: 'my-key' },
            })
            expect(key).toEqual({
                id: KEY_ID,
                name: 'my-key',
                publicKey: ED25519_PUB_B64,
            })
        })

        test('falls back to key id when name is missing', async () => {
            dfnsKeysMock.createKey.mockResolvedValue({
                id: KEY_ID,
                publicKey: ED25519_PUB_HEX,
            })

            const key = await createHandler().createKey('ignored')

            expect(key.name).toBe(KEY_ID)
        })

        test('rethrows API errors', async () => {
            const err = new Error('create failed')
            dfnsKeysMock.createKey.mockRejectedValue(err)

            await expect(createHandler().createKey('x')).rejects.toThrow(err)
        })
    })

    describe('iterateKeys and listKeys', () => {
        test('yields only active Canton ed25519 keys across pages', async () => {
            dfnsKeysMock.listKeys
                .mockResolvedValueOnce({
                    items: [
                        activeDfnsKey(),
                        activeDfnsKey({
                            id: 'inactive',
                            status: 'Inactive',
                        }),
                        activeDfnsKey({
                            id: 'wrong-curve',
                            curve: 'secp256k1',
                        }),
                    ],
                    nextPageToken: 'page-2',
                })
                .mockResolvedValueOnce({
                    items: [
                        activeDfnsKey({
                            id: 'key-2',
                            name: 'second',
                            publicKey: `0x${'cd'.repeat(32)}`,
                        }),
                    ],
                    nextPageToken: undefined,
                })

            const keys = await createHandler().listKeys()

            expect(keys).toHaveLength(2)
            expect(keys[0]?.id).toBe(KEY_ID)
            expect(keys[1]?.id).toBe('key-2')
            expect(keys[1]?.name).toBe('second')
            expect(dfnsKeysMock.listKeys).toHaveBeenNthCalledWith(1, {
                query: { limit: 50 },
            })
            expect(dfnsKeysMock.listKeys).toHaveBeenNthCalledWith(2, {
                query: { limit: 50, paginationToken: 'page-2' },
            })
        })

        test('uses key id when list item name is missing', async () => {
            dfnsKeysMock.listKeys.mockResolvedValue({
                items: [activeDfnsKey({ name: undefined })],
                nextPageToken: undefined,
            })

            const keys = await createHandler().listKeys()

            expect(keys[0]?.name).toBe(KEY_ID)
        })

        test('rethrows list errors', async () => {
            const err = new Error('list failed')
            dfnsKeysMock.listKeys.mockRejectedValue(err)

            await expect(createHandler().listKeys()).rejects.toThrow(err)
        })
    })

    describe('getKey', () => {
        test('returns mapped key for active Canton keys', async () => {
            dfnsKeysMock.getKey.mockResolvedValue(activeDfnsKey())

            const key = await createHandler().getKey(KEY_ID)

            expect(key).toEqual({
                id: KEY_ID,
                name: 'canton-key',
                publicKey: ED25519_PUB_B64,
            })
        })

        test('uses key id when name is missing', async () => {
            dfnsKeysMock.getKey.mockResolvedValue(
                activeDfnsKey({ name: undefined })
            )

            const key = await createHandler().getKey(KEY_ID)

            expect(key?.name).toBe(KEY_ID)
        })

        test('returns undefined for inactive or non-Canton keys', async () => {
            dfnsKeysMock.getKey.mockResolvedValue(
                activeDfnsKey({ status: 'Inactive' })
            )
            expect(await createHandler().getKey(KEY_ID)).toBeUndefined()

            dfnsKeysMock.getKey.mockResolvedValue(
                activeDfnsKey({ scheme: 'ECDSA' })
            )
            expect(await createHandler().getKey(KEY_ID)).toBeUndefined()
        })

        test('returns undefined when the API throws', async () => {
            dfnsKeysMock.getKey.mockRejectedValue(new Error('not found'))

            expect(await createHandler().getKey('missing')).toBeUndefined()
        })
    })

    describe('findKeyByPublicKey', () => {
        test('returns the matching key', async () => {
            dfnsKeysMock.listKeys.mockResolvedValue({
                items: [
                    activeDfnsKey({
                        id: 'other',
                        publicKey: `0x${'cd'.repeat(32)}`,
                    }),
                    activeDfnsKey(),
                ],
                nextPageToken: undefined,
            })

            const key =
                await createHandler().findKeyByPublicKey(ED25519_PUB_B64)

            expect(key?.id).toBe(KEY_ID)
        })

        test('returns undefined when no key matches', async () => {
            dfnsKeysMock.listKeys.mockResolvedValue({
                items: [
                    activeDfnsKey({
                        publicKey: `0x${'cd'.repeat(32)}`,
                    }),
                ],
                nextPageToken: undefined,
            })

            expect(
                await createHandler().findKeyByPublicKey('unknown-pk')
            ).toBeUndefined()
        })
    })

    describe('signHash', () => {
        const hex = '74657374'
        const hashBase64 = Buffer.from(hex, 'hex').toString('base64')

        test('submits a Message signature with hex payload and externalId', async () => {
            dfnsKeysMock.generateSignature.mockResolvedValue({
                id: SIG_ID,
                status: 'Signed',
                signature: {
                    encoded: `0x${'11'.repeat(64)}`,
                },
            })

            const sig = await createHandler().signHash(
                KEY_ID,
                hashBase64,
                'internal-1'
            )

            expect(dfnsKeysMock.generateSignature).toHaveBeenCalledWith({
                keyId: KEY_ID,
                body: {
                    kind: 'Message',
                    message: hex,
                    externalId: 'internal-1',
                },
            })
            expect(sig).toEqual({
                id: SIG_ID,
                keyId: KEY_ID,
                status: 'signed',
                signature: Buffer.from('11'.repeat(64), 'hex').toString(
                    'base64'
                ),
            })
        })

        test('omits externalId when not provided', async () => {
            dfnsKeysMock.generateSignature.mockResolvedValue({
                id: SIG_ID,
                status: 'Pending',
            })

            const sig = await createHandler().signHash(KEY_ID, hashBase64)

            expect(dfnsKeysMock.generateSignature).toHaveBeenCalledWith({
                keyId: KEY_ID,
                body: { kind: 'Message', message: hex },
            })
            expect(sig.status).toBe('pending')
            expect(sig.signature).toBeUndefined()
        })

        test('maps Dfns statuses and assembles signature from r/s', async () => {
            const cases = [
                ['Confirmed', 'signed'],
                ['Executing', 'pending'],
                ['Rejected', 'rejected'],
                ['Failed', 'failed'],
                ['Unknown', 'pending'],
            ] as const

            for (const [dfnsStatus, mapped] of cases) {
                dfnsKeysMock.generateSignature.mockResolvedValueOnce({
                    id: `${SIG_ID}-${dfnsStatus}`,
                    status: dfnsStatus,
                    signature: {
                        r: '0x' + 'aa'.repeat(32),
                        s: '0x' + 'bb'.repeat(32),
                    },
                })

                const sig = await createHandler().signHash(KEY_ID, hashBase64)
                expect(sig.status).toBe(mapped)
                expect(sig.signature).toBe(
                    Buffer.from(
                        'aa'.repeat(32) + 'bb'.repeat(32),
                        'hex'
                    ).toString('base64')
                )
            }
        })

        test('rethrows generateSignature errors', async () => {
            const err = new Error('sign failed')
            dfnsKeysMock.generateSignature.mockRejectedValue(err)

            await expect(
                createHandler().signHash(KEY_ID, hashBase64)
            ).rejects.toThrow(err)
        })
    })

    describe('signMessage', () => {
        test('submits the UTF-8 message as hex with kind Message', async () => {
            const message = 'header.payload'
            dfnsKeysMock.generateSignature.mockResolvedValue({
                id: SIG_ID,
                status: 'Signed',
                signature: {
                    encoded: `0x${'11'.repeat(64)}`,
                },
            })

            const sig = await createHandler().signMessage(KEY_ID, message)

            expect(dfnsKeysMock.generateSignature).toHaveBeenCalledWith({
                keyId: KEY_ID,
                body: {
                    kind: 'Message',
                    message: Buffer.from(message, 'utf8').toString('hex'),
                },
            })
            expect(sig).toEqual({
                id: SIG_ID,
                keyId: KEY_ID,
                status: 'signed',
                signature: Buffer.from('11'.repeat(64), 'hex').toString(
                    'base64'
                ),
            })
        })

        test('passes the externalId when provided', async () => {
            const message = 'header.payload'
            dfnsKeysMock.generateSignature.mockResolvedValue({
                id: SIG_ID,
                status: 'Pending',
            })

            await createHandler().signMessage(KEY_ID, message, 'msg-1')

            expect(dfnsKeysMock.generateSignature).toHaveBeenCalledWith({
                keyId: KEY_ID,
                body: {
                    kind: 'Message',
                    message: Buffer.from(message, 'utf8').toString('hex'),
                    externalId: 'msg-1',
                },
            })
        })
    })

    describe('getSignature', () => {
        test('returns mapped signature', async () => {
            dfnsKeysMock.getSignature.mockResolvedValue({
                id: SIG_ID,
                status: 'Signed',
                signature: { encoded: `0x${'22'.repeat(64)}` },
            })

            const sig = await createHandler().getSignature(KEY_ID, SIG_ID)

            expect(sig).toEqual({
                id: SIG_ID,
                keyId: KEY_ID,
                status: 'signed',
                signature: Buffer.from('22'.repeat(64), 'hex').toString(
                    'base64'
                ),
            })
        })

        test('returns undefined when the API throws', async () => {
            dfnsKeysMock.getSignature.mockRejectedValue(new Error('missing'))

            expect(
                await createHandler().getSignature(KEY_ID, 'missing')
            ).toBeUndefined()
        })
    })

    describe('findSignature', () => {
        const hashBase64 = Buffer.from('aa', 'hex').toString('base64')

        test('uses cached key id from signHash', async () => {
            dfnsKeysMock.generateSignature.mockResolvedValue({
                id: SIG_ID,
                status: 'Signed',
            })
            dfnsKeysMock.getSignature.mockResolvedValue({
                id: SIG_ID,
                status: 'Signed',
                signature: { encoded: `0x${'33'.repeat(64)}` },
            })

            const handler = createHandler()
            await handler.signHash(KEY_ID, hashBase64)
            dfnsKeysMock.getSignature.mockClear()

            const sig = await handler.findSignature(SIG_ID)

            expect(sig?.id).toBe(SIG_ID)
            expect(dfnsKeysMock.getSignature).toHaveBeenCalledWith({
                keyId: KEY_ID,
                signatureId: SIG_ID,
            })
            expect(dfnsKeysMock.listKeys).not.toHaveBeenCalled()
        })

        test('iterates keys when cache misses or cached lookup fails', async () => {
            dfnsKeysMock.listKeys.mockResolvedValue({
                items: [
                    activeDfnsKey({ id: 'key-a' }),
                    activeDfnsKey({ id: 'key-b' }),
                ],
                nextPageToken: undefined,
            })
            dfnsKeysMock.getSignature
                .mockRejectedValueOnce(new Error('missing on a'))
                .mockResolvedValueOnce({
                    id: SIG_ID,
                    status: 'Pending',
                })

            const sig = await createHandler().findSignature(SIG_ID)

            expect(sig?.status).toBe('pending')
            expect(dfnsKeysMock.getSignature).toHaveBeenCalledTimes(2)
        })

        test('skips cached key during iteration after a failed cached lookup', async () => {
            dfnsKeysMock.generateSignature.mockResolvedValue({
                id: SIG_ID,
                status: 'Pending',
            })
            dfnsKeysMock.listKeys.mockResolvedValue({
                items: [
                    activeDfnsKey({ id: KEY_ID }),
                    activeDfnsKey({ id: 'key-b' }),
                ],
                nextPageToken: undefined,
            })
            dfnsKeysMock.getSignature
                .mockRejectedValueOnce(new Error('cached miss'))
                .mockResolvedValueOnce({
                    id: SIG_ID,
                    status: 'Signed',
                    signature: { encoded: `0x${'44'.repeat(64)}` },
                })

            const handler = createHandler()
            await handler.signHash(KEY_ID, hashBase64)

            const sig = await handler.findSignature(SIG_ID)

            expect(sig?.status).toBe('signed')
            expect(dfnsKeysMock.getSignature).toHaveBeenCalledWith({
                keyId: 'key-b',
                signatureId: SIG_ID,
            })
        })

        test('returns undefined when signature is not found', async () => {
            dfnsKeysMock.listKeys.mockResolvedValue({
                items: [activeDfnsKey()],
                nextPageToken: undefined,
            })
            dfnsKeysMock.getSignature.mockRejectedValue(new Error('missing'))

            expect(
                await createHandler().findSignature('missing')
            ).toBeUndefined()
        })
    })

    describe('listSignatures', () => {
        test('yields mapped signatures across pages', async () => {
            dfnsKeysMock.listSignatures
                .mockResolvedValueOnce({
                    items: [
                        {
                            id: 'sig-1',
                            status: 'Signed',
                            signature: { encoded: `0x${'55'.repeat(64)}` },
                        },
                    ],
                    nextPageToken: 'sig-page-2',
                })
                .mockResolvedValueOnce({
                    items: [{ id: 'sig-2', status: 'Rejected' }],
                    nextPageToken: undefined,
                })

            const signatures = []
            for await (const sig of createHandler().listSignatures(KEY_ID)) {
                signatures.push(sig)
            }

            expect(signatures).toEqual([
                {
                    id: 'sig-1',
                    keyId: KEY_ID,
                    status: 'signed',
                    signature: Buffer.from('55'.repeat(64), 'hex').toString(
                        'base64'
                    ),
                },
                {
                    id: 'sig-2',
                    keyId: KEY_ID,
                    status: 'rejected',
                    signature: undefined,
                },
            ])
            expect(dfnsKeysMock.listSignatures).toHaveBeenNthCalledWith(1, {
                keyId: KEY_ID,
                query: { limit: 50 },
            })
            expect(dfnsKeysMock.listSignatures).toHaveBeenNthCalledWith(2, {
                keyId: KEY_ID,
                query: { limit: 50, paginationToken: 'sig-page-2' },
            })
        })
    })
})
