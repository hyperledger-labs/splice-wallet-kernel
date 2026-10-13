// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
    keyLabelFromPublicKey,
    mapTsbStatus,
    normalizePublicKey,
    normalizeSignature,
    SigningAPIClient,
} from './signing-api-sdk.js'

describe('SigningAPIClient', () => {
    let fetchMock: ReturnType<typeof vi.fn>

    beforeEach(() => {
        fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    function jsonResponse(body: unknown, status = 200): Response {
        return new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json' },
        })
    }

    function callsFor(endpoint: string) {
        return fetchMock.mock.calls.filter((call) =>
            String(call[0]).endsWith(endpoint)
        )
    }

    function initFor(endpoint: string): RequestInit {
        const call = callsFor(endpoint)[0]
        expect(call).toBeDefined()
        return call![1] as RequestInit
    }

    it('constructor strips a trailing slash from the base URL', () => {
        const client = new SigningAPIClient('http://tsb.example/')
        expect(client.getConfiguration().BaseURL).toBe('http://tsb.example')
    })

    it('normalizes Ed25519 DER/SPKI public keys to raw public keys', () => {
        const raw = Buffer.alloc(32, 7)
        const der = Buffer.concat([
            Buffer.from('302a300506032b6570032100', 'hex'),
            raw,
        ])

        expect(normalizePublicKey(der.toString('base64'))).toBe(
            raw.toString('base64')
        )
    })

    it('keeps unknown public key encodings unchanged', () => {
        const publicKey = Buffer.alloc(33, 1).toString('base64')
        expect(normalizePublicKey(publicKey)).toBe(publicKey)
    })

    it('derives label-safe TSB key labels from public keys', () => {
        expect(keyLabelFromPublicKey('abc+/=')).toBe('abc-_')
    })

    it('keeps raw Ed25519 signatures in wallet format', () => {
        const rawSignature = Buffer.alloc(64, 11).toString('base64')

        expect(normalizeSignature(rawSignature)).toBe(rawSignature)
    })

    it('unwraps simple ASN.1 Ed25519 signature containers', () => {
        const rawSignature = Buffer.alloc(64, 12)
        const octetString = Buffer.concat([
            Buffer.from('0440', 'hex'),
            rawSignature,
        ])
        const bitString = Buffer.concat([
            Buffer.from('034100', 'hex'),
            rawSignature,
        ])

        expect(normalizeSignature(octetString.toString('base64'))).toBe(
            rawSignature.toString('base64')
        )
        expect(normalizeSignature(bitString.toString('base64'))).toBe(
            rawSignature.toString('base64')
        )
    })

    it('converts DER integer-pair Ed25519 signatures to wallet format', () => {
        const r = Buffer.from('80'.repeat(32), 'hex')
        const s = Buffer.from('01'.repeat(32), 'hex')
        const der = Buffer.concat([
            Buffer.from([0x30, 0x45]),
            Buffer.from([0x02, 0x21, 0x00]),
            r,
            Buffer.from([0x02, 0x20]),
            s,
        ])

        expect(normalizeSignature(der.toString('base64'))).toBe(
            Buffer.concat([r, s]).toString('base64')
        )
    })

    it('rejects wallet-incompatible Ed25519 signatures', () => {
        expect(() =>
            normalizeSignature(Buffer.alloc(65).toString('base64'))
        ).toThrow('Wallet Gateway expects a raw 64-byte Ed25519 signature')
    })

    it('leaves non-EdDSA signatures unchanged', () => {
        const ecdsaSignature = Buffer.alloc(70, 13).toString('base64')

        expect(normalizeSignature(ecdsaSignature, 'SHA256_WITH_ECDSA')).toBe(
            ecdsaSignature
        )
    })

    it('maps TSB statuses to signing statuses', () => {
        expect(mapTsbStatus('PENDING')).toBe('pending')
        expect(mapTsbStatus('APPROVED')).toBe('pending')
        expect(mapTsbStatus('EXECUTED')).toBe('signed')
        expect(mapTsbStatus('FAILED')).toBe('failed')
        expect(mapTsbStatus('REJECTED')).toBe('rejected')
        expect(mapTsbStatus('EXPIRED')).toBe('rejected')
        expect(mapTsbStatus('CANCELLED')).toBe('rejected')
    })

    it('uses key-management and key-operation API keys on the right endpoints', async () => {
        const client = new SigningAPIClient({
            baseUrl: 'http://tsb.example',
            keyManagementApiKey: 'key-mgmt',
            keyOperationApiKey: 'key-ops',
        })
        const rawPublicKey = Buffer.alloc(32, 3).toString('base64')
        fetchMock
            .mockResolvedValueOnce(jsonResponse(['wallet-key']))
            .mockResolvedValueOnce(
                jsonResponse({
                    json: {
                        label: 'wallet-key',
                        publicKey: rawPublicKey,
                    },
                })
            )
            .mockResolvedValueOnce(jsonResponse({ signRequestId: 'req-1' }))

        await client.signTransaction({
            tx: 'tx-bytes',
            txHash: 'hash',
            keyIdentifier: { publicKey: rawPublicKey },
        })

        expect(initFor('/v1/key').headers).toMatchObject({
            'X-API-KEY': 'key-mgmt',
        })
        expect(initFor('/v1/sign').headers).toMatchObject({
            'X-API-KEY': 'key-ops',
        })
    })

    it('sends bearer access token when configured', async () => {
        const client = new SigningAPIClient({
            baseUrl: 'http://tsb.example',
            bearerToken: 'jwt',
        })
        fetchMock.mockResolvedValueOnce(jsonResponse([]))

        await client.getKeys()

        expect(initFor('/v1/key').headers).toMatchObject({
            Authorization: 'Bearer jwt',
        })
    })

    it('uses an mTLS dispatcher when P12 configuration is provided', async () => {
        const tempDir = mkdtempSync(join(tmpdir(), 'tsb-mtls-'))
        const p12Path = join(tempDir, 'client.p12')
        writeFileSync(p12Path, 'dummy-p12')

        try {
            const client = new SigningAPIClient({
                baseUrl: 'https://tsb.example',
                mtlsP12Path: p12Path,
                mtlsP12Password: 'secret',
            })
            fetchMock.mockResolvedValueOnce(jsonResponse([]))

            await client.getKeys()

            const init = initFor('/v1/key') as RequestInit & {
                dispatcher?: unknown
            }
            expect(init.dispatcher).toBeDefined()
            expect(client.getConfiguration()).toMatchObject({
                MtlsP12Path: p12Path,
                MtlsP12Password: 'secret',
            })
        } finally {
            rmSync(tempDir, { recursive: true, force: true })
        }
    })

    it('createKey posts a TSB ED key request and returns a normalized key', async () => {
        const client = new SigningAPIClient({
            baseUrl: 'http://tsb.example',
            keyPassword: 'secret',
        })
        const raw = Buffer.alloc(32, 9)
        const der = Buffer.concat([
            Buffer.from('302a300506032b6570032100', 'hex'),
            raw,
        ])
        const finalLabel = keyLabelFromPublicKey(raw.toString('base64'))
        fetchMock
            .mockResolvedValueOnce(
                jsonResponse({
                    json: {
                        label: 'temporary-key',
                        publicKey: der.toString('base64'),
                    },
                })
            )
            .mockResolvedValueOnce(
                jsonResponse({
                    json: {
                        label: finalLabel,
                        publicKey: der.toString('base64'),
                    },
                })
            )

        const result = await client.createKey({ name: 'new-key' })

        expect(result).toEqual({
            id: finalLabel,
            name: finalLabel,
            publicKey: raw.toString('base64'),
        })

        const body = JSON.parse(initFor('/v1/key').body as string)
        expect(body).toEqual({
            label: expect.stringMatching(
                /^wallet-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
            ),
            password: 'secret',
            algorithm: 'ED',
            curveOid: '1.3.101.112',
            attributes: {
                decrypt: false,
                sign: true,
                verify: true,
                unwrap: false,
                extractable: false,
                modifiable: true,
                destroyable: true,
            },
            policy: {
                ruleUse: null,
                ruleBlock: null,
                ruleUnblock: null,
                ruleModify: null,
                keyStatus: {
                    blocked: false,
                },
            },
        })
        expect(
            JSON.parse(initFor('/v1/key/changeAttributes').body as string)
        ).toEqual({
            label: 'temporary-key',
            password: 'secret',
            modifyAttributes: {
                newLabel: finalLabel,
            },
        })
        expect(initFor('/v1/key/changeAttributes').method).toBe('PATCH')
    })

    it('ignores caller-provided key request shape when creating keys', async () => {
        const client = new SigningAPIClient('http://tsb.example')
        const publicKey = Buffer.alloc(32, 8).toString('base64')
        const finalLabel = keyLabelFromPublicKey(publicKey)
        fetchMock
            .mockResolvedValueOnce(
                jsonResponse({
                    json: {
                        label: 'temporary-key',
                        publicKey,
                    },
                })
            )
            .mockResolvedValueOnce(
                jsonResponse({
                    json: {
                        label: finalLabel,
                        publicKey,
                    },
                })
            )

        await client.createKey({
            name: 'ska-key',
            id: 'caller-id',
            algorithm: 'EC',
            curveOid: '1.3.132.0.10',
            attributes: { decrypt: true },
            policy: { keyStatus: { blocked: true } },
        })

        const body = JSON.parse(initFor('/v1/key').body as string)
        expect(body).toMatchObject({
            label: expect.stringMatching(/^wallet-/),
            algorithm: 'ED',
            curveOid: '1.3.101.112',
            attributes: {
                decrypt: false,
                sign: true,
                verify: true,
                unwrap: false,
                extractable: false,
                modifiable: true,
                destroyable: true,
            },
            policy: {
                ruleUse: null,
                ruleBlock: null,
                ruleUnblock: null,
                ruleModify: null,
                keyStatus: {
                    blocked: false,
                },
            },
        })
        expect(body).not.toHaveProperty('id')
        expect(body).not.toHaveProperty('algorithmOid')
        const changeBody = JSON.parse(
            initFor('/v1/key/changeAttributes').body as string
        )
        expect(changeBody.modifyAttributes).toEqual({ newLabel: finalLabel })
    })

    it('signTransaction creates an async TSB sign request by key id', async () => {
        const client = new SigningAPIClient({
            baseUrl: 'http://tsb.example',
            keyPassword: 'secret',
            signatureAlgorithm: 'EDDSA',
        })
        fetchMock
            .mockResolvedValueOnce(
                jsonResponse({
                    json: {
                        label: 'wallet-key',
                        publicKey: Buffer.alloc(32, 1).toString('base64'),
                    },
                })
            )
            .mockResolvedValueOnce(jsonResponse({ signRequestId: 'req-1' }))

        const result = await client.signTransaction({
            tx: 'tx-bytes',
            txHash: 'hash-base64',
            internalTxId: 'wallet-tx-1',
            keyIdentifier: { id: 'wallet-key' },
        })

        expect(result).toMatchObject({
            txId: 'req-1',
            status: 'pending',
            publicKey: Buffer.alloc(32, 1).toString('base64'),
        })

        const body = JSON.parse(initFor('/v1/sign').body as string)
        expect(body).toMatchObject({
            signRequest: {
                payload: 'hash-base64',
                payloadType: 'UNSPECIFIED',
                signKeyName: 'wallet-key',
                keyPassword: 'secret',
                signatureAlgorithm: 'EDDSA',
                signatureType: 'RAW',
            },
        })
        expect(body.requestSignature).toBeUndefined()
    })

    it('signMessage base64-encodes the UTF-8 message payload', async () => {
        const client = new SigningAPIClient({
            baseUrl: 'http://tsb.example',
            keyPassword: 'secret',
            signatureAlgorithm: 'EDDSA',
        })
        const message = 'header.payload'
        fetchMock
            .mockResolvedValueOnce(
                jsonResponse({
                    json: {
                        label: 'wallet-key',
                        publicKey: Buffer.alloc(32, 1).toString('base64'),
                    },
                })
            )
            .mockResolvedValueOnce(jsonResponse({ signRequestId: 'req-msg' }))

        const result = await client.signMessage({
            message,
            keyIdentifier: { id: 'wallet-key' },
        })

        expect(result).toMatchObject({
            txId: 'req-msg',
            status: 'pending',
        })

        const body = JSON.parse(initFor('/v1/sign').body as string)
        expect(body).toMatchObject({
            signRequest: {
                payload: Buffer.from(message, 'utf8').toString('base64'),
                payloadType: 'UNSPECIFIED',
                signKeyName: 'wallet-key',
                keyPassword: 'secret',
                signatureAlgorithm: 'EDDSA',
                signatureType: 'RAW',
            },
        })
    })

    it('merges signMessage request details into the later getTransaction result', async () => {
        const client = new SigningAPIClient('http://tsb.example')
        const publicKey = Buffer.alloc(32, 7).toString('base64')
        const signature = Buffer.alloc(64, 7).toString('base64')
        fetchMock
            .mockResolvedValueOnce(
                jsonResponse({
                    json: {
                        label: 'wallet-key',
                        publicKey,
                    },
                })
            )
            .mockResolvedValueOnce(jsonResponse({ signRequestId: 'req-msg' }))
            .mockResolvedValueOnce(
                jsonResponse({
                    id: 'req-msg',
                    status: 'EXECUTED',
                    result: signature,
                })
            )

        await client.signMessage({
            message: 'hello',
            keyIdentifier: { id: 'wallet-key' },
            internalTxId: 'msg-1',
        })
        const result = await client.getTransaction({ txId: 'req-msg' })

        expect(result).toEqual({
            txId: 'req-msg',
            status: 'signed',
            signature,
            publicKey,
            metadata: {
                internalTxId: 'msg-1',
                keyIdentifier: { id: 'wallet-key' },
                signatureAlgorithm: 'EDDSA',
                signatureType: 'RAW',
                tsbStatus: 'EXECUTED',
            },
        })
    })

    it('signTransaction uses the cached key after createKey returns a public key', async () => {
        const client = new SigningAPIClient('http://tsb.example')
        const publicKey = Buffer.alloc(32, 6).toString('base64')
        const finalLabel = keyLabelFromPublicKey(publicKey)
        fetchMock
            .mockResolvedValueOnce(
                jsonResponse({
                    json: {
                        label: 'temporary-key',
                        publicKey,
                    },
                })
            )
            .mockResolvedValueOnce(
                jsonResponse({
                    json: {
                        label: finalLabel,
                        publicKey,
                    },
                })
            )
            .mockResolvedValueOnce(jsonResponse({ signRequestId: 'req-1' }))

        const key = await client.createKey({ name: 'new-wallet-key' })
        await client.signTransaction({
            tx: 'tx-bytes',
            txHash: 'hash-base64',
            keyIdentifier: { publicKey: key.publicKey },
        })

        const keyCalls = callsFor('/v1/key')
        expect(keyCalls).toHaveLength(1)
        expect((keyCalls[0]![1] as RequestInit).method).toBe('POST')
        expect(callsFor('/v1/key/attributes')).toHaveLength(0)

        const body = JSON.parse(initFor('/v1/sign').body as string)
        expect(body.signRequest.signKeyName).toBe(finalLabel)
    })

    it('signTransaction validates supplied key id and public key before caching', async () => {
        const client = new SigningAPIClient({
            baseUrl: 'http://tsb.example',
            keyPassword: 'secret',
        })
        const publicKey = Buffer.alloc(32, 2).toString('base64')
        fetchMock
            .mockResolvedValueOnce(
                jsonResponse({
                    json: {
                        label: 'wallet-key',
                        publicKey,
                    },
                })
            )
            .mockResolvedValueOnce(jsonResponse({ signRequestId: 'req-1' }))

        const result = await client.signTransaction({
            tx: 'tx-bytes',
            txHash: 'hash-base64',
            keyIdentifier: { id: 'wallet-key', publicKey },
        })

        expect(callsFor('/v1/key/attributes')).toHaveLength(1)
        expect(
            JSON.parse(initFor('/v1/key/attributes').body as string)
        ).toEqual({
            label: 'wallet-key',
            password: 'secret',
        })
        expect(result).toMatchObject({
            txId: 'req-1',
            status: 'pending',
            publicKey,
        })
        const body = JSON.parse(initFor('/v1/sign').body as string)
        expect(body.signRequest).toMatchObject({
            signKeyName: 'wallet-key',
            keyPassword: 'secret',
        })
    })

    it('signTransaction uses a matching cached key without fetching key attributes', async () => {
        const client = new SigningAPIClient('http://tsb.example')
        const publicKey = Buffer.alloc(32, 3).toString('base64')
        const finalLabel = keyLabelFromPublicKey(publicKey)
        fetchMock
            .mockResolvedValueOnce(
                jsonResponse({
                    json: {
                        label: 'temporary-key',
                        publicKey,
                    },
                })
            )
            .mockResolvedValueOnce(
                jsonResponse({
                    json: {
                        label: finalLabel,
                        publicKey,
                    },
                })
            )
            .mockResolvedValueOnce(jsonResponse({ signRequestId: 'req-1' }))

        const key = await client.createKey({ name: 'wallet-key' })
        await client.signTransaction({
            tx: 'tx-bytes',
            txHash: 'hash-base64',
            keyIdentifier: { id: key.id, publicKey: key.publicKey },
        })

        expect(callsFor('/v1/key/attributes')).toHaveLength(0)
        const body = JSON.parse(initFor('/v1/sign').body as string)
        expect(body.signRequest.signKeyName).toBe(finalLabel)
    })

    it('rejects supplied key id and public key pairs that TSB does not confirm', async () => {
        const client = new SigningAPIClient('http://tsb.example')
        const actualPublicKey = Buffer.alloc(32, 4).toString('base64')
        const suppliedPublicKey = Buffer.alloc(32, 5).toString('base64')
        fetchMock
            .mockResolvedValueOnce(
                jsonResponse({
                    json: {
                        label: 'wallet-key',
                        publicKey: actualPublicKey,
                    },
                })
            )
            .mockResolvedValueOnce(jsonResponse([]))

        await expect(
            client.signTransaction({
                tx: 'tx-bytes',
                txHash: 'hash-base64',
                keyIdentifier: {
                    id: 'wallet-key',
                    publicKey: suppliedPublicKey,
                },
            })
        ).rejects.toThrow(
            "TSB key 'wallet-key' public key does not match the provided keyIdentifier publicKey"
        )

        await expect(
            client.signTransaction({
                tx: 'tx-bytes',
                txHash: 'hash-base64',
                keyIdentifier: { publicKey: actualPublicKey },
            })
        ).rejects.toThrow('Unable to resolve TSB signing key from publicKey')
        expect(callsFor('/v1/sign')).toHaveLength(0)
    })

    it('signTransaction rejects when no TSB key matches the public key', async () => {
        const client = new SigningAPIClient('http://tsb.example')
        fetchMock.mockResolvedValueOnce(jsonResponse([]))

        await expect(
            client.signTransaction({
                tx: 'tx-bytes',
                txHash: 'hash-base64',
                keyIdentifier: {
                    publicKey: Buffer.alloc(32, 7).toString('base64'),
                },
            })
        ).rejects.toThrow('Unable to resolve TSB signing key from publicKey')
    })

    it('signTransaction skips unreadable TSB keys when resolving by public key', async () => {
        const client = new SigningAPIClient('http://tsb.example')
        const publicKey = Buffer.alloc(32, 10).toString('base64')
        fetchMock
            .mockResolvedValueOnce(jsonResponse(['system-key', 'wallet-key']))
            .mockResolvedValueOnce(
                jsonResponse(
                    {
                        errorCode: 701,
                        reason: 'res.error.in.hsm',
                        message:
                            'HSM error: status: PKCS#11: KEY_FUNCTION_NOT_PERMITTED',
                    },
                    500
                )
            )
            .mockResolvedValueOnce(
                jsonResponse({
                    json: {
                        label: 'wallet-key',
                        publicKey,
                    },
                })
            )
            .mockResolvedValueOnce(jsonResponse({ signRequestId: 'req-1' }))

        await client.signTransaction({
            tx: 'tx-bytes',
            txHash: 'hash-base64',
            keyIdentifier: { publicKey },
        })

        expect(callsFor('/v1/key/attributes')).toHaveLength(2)
        const body = JSON.parse(initFor('/v1/sign').body as string)
        expect(body.signRequest.signKeyName).toBe('wallet-key')
    })

    it('getTransaction maps executed TSB requests to signed transactions', async () => {
        const client = new SigningAPIClient('http://tsb.example')
        const signature = Buffer.alloc(64, 4).toString('base64')
        fetchMock.mockResolvedValueOnce(
            jsonResponse({
                id: 'req-1',
                status: 'EXECUTED',
                executionTime: '2026-06-22T12:00:00',
                result: signature,
            })
        )

        const result = await client.getTransaction({ txId: 'req-1' })

        expect(result).toEqual({
            txId: 'req-1',
            status: 'signed',
            signature,
            metadata: {
                tsbStatus: 'EXECUTED',
                executionTime: '2026-06-22T12:00:00',
            },
        })
    })

    it('keeps executed TSB requests pending until a signature is present', async () => {
        const client = new SigningAPIClient('http://tsb.example')
        fetchMock.mockResolvedValueOnce(
            jsonResponse({
                id: 'req-1',
                status: 'EXECUTED',
            })
        )

        const result = await client.getTransaction({ txId: 'req-1' })

        expect(result).toEqual({
            txId: 'req-1',
            status: 'pending',
            metadata: {
                tsbStatus: 'EXECUTED',
            },
        })
    })

    it('keeps executed TSB requests pending when the signature result is empty', async () => {
        const client = new SigningAPIClient('http://tsb.example')
        fetchMock.mockResolvedValueOnce(
            jsonResponse({
                id: 'req-1',
                status: 'EXECUTED',
                result: '',
            })
        )

        const result = await client.getTransaction({ txId: 'req-1' })

        expect(result).toEqual({
            txId: 'req-1',
            status: 'pending',
            metadata: {
                tsbStatus: 'EXECUTED',
            },
        })
    })

    it('keeps TSB response metadata ahead of cached transaction metadata', async () => {
        const client = new SigningAPIClient('http://tsb.example')
        const publicKey = Buffer.alloc(32, 12).toString('base64')
        const signature = Buffer.alloc(64, 12).toString('base64')
        fetchMock
            .mockResolvedValueOnce(
                jsonResponse({
                    json: {
                        label: 'wallet-key',
                        publicKey,
                    },
                })
            )
            .mockResolvedValueOnce(jsonResponse({ signRequestId: 'req-1' }))
            .mockResolvedValueOnce(
                jsonResponse({
                    id: 'req-1',
                    status: 'PENDING',
                    approvedBy: ['old-reviewer'],
                })
            )
            .mockResolvedValueOnce(
                jsonResponse({
                    id: 'req-1',
                    status: 'EXECUTED',
                    executionTime: '2026-06-22T12:00:00',
                    approvedBy: ['new-reviewer'],
                    result: signature,
                })
            )

        await client.signTransaction({
            tx: 'tx-bytes',
            txHash: 'hash-base64',
            keyIdentifier: { id: 'wallet-key', publicKey },
        })
        await client.getTransaction({ txId: 'req-1' })

        const result = await client.getTransaction({ txId: 'req-1' })

        expect(result.metadata).toEqual({
            keyIdentifier: { id: 'wallet-key', publicKey },
            signatureAlgorithm: 'EDDSA',
            signatureType: 'RAW',
            tsbStatus: 'EXECUTED',
            approvedBy: ['new-reviewer'],
            executionTime: '2026-06-22T12:00:00',
        })
    })

    it('rejects executed EdDSA transactions with incompatible TSB signature bytes', async () => {
        const client = new SigningAPIClient('http://tsb.example')
        fetchMock.mockResolvedValueOnce(
            jsonResponse({
                id: 'req-1',
                status: 'EXECUTED',
                result: Buffer.alloc(65).toString('base64'),
            })
        )

        await expect(client.getTransaction({ txId: 'req-1' })).rejects.toThrow(
            'Wallet Gateway expects a raw 64-byte Ed25519 signature'
        )
    })

    it('getTransactions fetches every provided txId', async () => {
        const client = new SigningAPIClient('http://tsb.example')
        fetchMock
            .mockResolvedValueOnce(
                jsonResponse({ id: 'req-1', status: 'PENDING' })
            )
            .mockResolvedValueOnce(
                jsonResponse({ id: 'req-2', status: 'FAILED' })
            )

        const result = await client.getTransactions({
            txIds: ['req-1', 'req-2'],
        })

        expect(result.map((tx) => tx.status)).toEqual(['pending', 'failed'])
        expect(callsFor('/v1/request/req-1')).toHaveLength(1)
        expect(callsFor('/v1/request/req-2')).toHaveLength(1)
    })

    it('getTransactions refreshes cached transactions by public key', async () => {
        const client = new SigningAPIClient('http://tsb.example')
        const publicKey = Buffer.alloc(32, 6).toString('base64')
        const signature = Buffer.alloc(64, 6).toString('base64')
        fetchMock
            .mockResolvedValueOnce(
                jsonResponse({
                    json: {
                        label: 'wallet-key',
                        publicKey,
                    },
                })
            )
            .mockResolvedValueOnce(jsonResponse({ signRequestId: 'req-1' }))
            .mockResolvedValueOnce(
                jsonResponse({
                    id: 'req-1',
                    status: 'EXECUTED',
                    result: signature,
                })
            )

        await client.signTransaction({
            tx: 'tx-bytes',
            txHash: 'hash-base64',
            keyIdentifier: { id: 'wallet-key', publicKey },
        })

        const result = await client.getTransactions({
            publicKeys: [publicKey],
        })

        expect(result).toEqual([
            {
                txId: 'req-1',
                status: 'signed',
                signature,
                publicKey,
                metadata: {
                    keyIdentifier: { id: 'wallet-key', publicKey },
                    signatureAlgorithm: 'EDDSA',
                    signatureType: 'RAW',
                    tsbStatus: 'EXECUTED',
                },
            },
        ])
    })

    it('getTransactions propagates non-404 errors while refreshing cached txIds', async () => {
        const client = new SigningAPIClient('http://tsb.example')
        fetchMock.mockResolvedValueOnce(
            new Response('TSB down', {
                status: 500,
                statusText: 'Server Error',
            })
        )

        await expect(
            client.getTransactions({ txIds: ['req-1'] })
        ).rejects.toThrow('TSB API call to /v1/request/req-1 failed (500)')
    })

    it('getTransactions skips missing txIds without failing the batch', async () => {
        const client = new SigningAPIClient('http://tsb.example')
        fetchMock
            .mockResolvedValueOnce(
                new Response('missing', {
                    status: 404,
                    statusText: 'Not Found',
                })
            )
            .mockResolvedValueOnce(
                jsonResponse({ id: 'req-2', status: 'FAILED' })
            )

        const result = await client.getTransactions({
            txIds: ['deleted', 'req-2'],
        })

        expect(result).toEqual([
            {
                txId: 'req-2',
                status: 'failed',
                metadata: {
                    tsbStatus: 'FAILED',
                },
            },
        ])
    })

    it('getTransactions skips stale ids returned by filteredRequests', async () => {
        const client = new SigningAPIClient('http://tsb.example')
        const signature = Buffer.alloc(64, 5).toString('base64')
        fetchMock
            .mockResolvedValueOnce(
                jsonResponse({
                    requests: [
                        { id: 'stale', status: 'EXECUTED' },
                        { id: 'live', status: 'EXECUTED' },
                    ],
                })
            )
            .mockResolvedValueOnce(
                new Response('missing', {
                    status: 404,
                    statusText: 'Not Found',
                })
            )
            .mockResolvedValueOnce(
                jsonResponse({
                    id: 'live',
                    status: 'EXECUTED',
                    result: signature,
                })
            )

        const result = await client.getTransactions({})

        expect(result).toEqual([
            {
                txId: 'live',
                status: 'signed',
                signature,
                metadata: {
                    tsbStatus: 'EXECUTED',
                },
            },
        ])
    })

    it('getKeys enumerates labels and fetches attributes for each key', async () => {
        const client = new SigningAPIClient('http://tsb.example')
        fetchMock
            .mockResolvedValueOnce(jsonResponse(['key-1', 'key-2']))
            .mockResolvedValueOnce(
                jsonResponse({
                    json: {
                        label: 'key-1',
                        publicKey: Buffer.alloc(32, 1).toString('base64'),
                    },
                })
            )
            .mockResolvedValueOnce(
                jsonResponse({
                    json: {
                        label: 'key-2',
                        publicKey: Buffer.alloc(32, 2).toString('base64'),
                    },
                })
            )

        const result = await client.getKeys()

        expect(result).toEqual([
            {
                id: 'key-1',
                name: 'key-1',
                publicKey: Buffer.alloc(32, 1).toString('base64'),
            },
            {
                id: 'key-2',
                name: 'key-2',
                publicKey: Buffer.alloc(32, 2).toString('base64'),
            },
        ])
    })

    it('getKeys skips TSB keys whose attributes are not available', async () => {
        const client = new SigningAPIClient('http://tsb.example')
        fetchMock
            .mockResolvedValueOnce(jsonResponse(['system-key', 'wallet-key']))
            .mockResolvedValueOnce(
                jsonResponse(
                    {
                        errorCode: 701,
                        reason: 'res.error.in.hsm',
                        message:
                            'HSM error: status: PKCS#11: KEY_FUNCTION_NOT_PERMITTED',
                    },
                    500
                )
            )
            .mockResolvedValueOnce(
                jsonResponse({
                    json: {
                        label: 'wallet-key',
                        publicKey: Buffer.alloc(32, 2).toString('base64'),
                    },
                })
            )

        const result = await client.getKeys()

        expect(result).toEqual([
            {
                id: 'wallet-key',
                name: 'wallet-key',
                publicKey: Buffer.alloc(32, 2).toString('base64'),
            },
        ])
    })

    it('throws with the response body when TSB returns an error', async () => {
        const client = new SigningAPIClient('http://tsb.example')
        fetchMock.mockResolvedValueOnce(
            new Response('bad key', {
                status: 400,
                statusText: 'Bad Request',
            })
        )

        await expect(client.getKeys()).rejects.toThrow(
            'TSB API call to /v1/key failed (400): bad key'
        )
    })

    it('cancelTransaction marks cached transactions rejected', async () => {
        const client = new SigningAPIClient('http://tsb.example')
        const publicKey = Buffer.alloc(32, 10).toString('base64')
        fetchMock
            .mockResolvedValueOnce(
                jsonResponse({
                    json: {
                        label: 'wallet-key',
                        publicKey,
                    },
                })
            )
            .mockResolvedValueOnce(jsonResponse({ signRequestId: 'req-1' }))
            .mockResolvedValueOnce(new Response(null, { status: 204 }))
            .mockResolvedValueOnce(
                jsonResponse({
                    id: 'req-1',
                    status: 'CANCELLED',
                })
            )

        await client.signTransaction({
            tx: 'tx-bytes',
            txHash: 'hash-base64',
            keyIdentifier: { id: 'wallet-key', publicKey },
        })
        await client.cancelTransaction('req-1')

        const result = await client.getTransactions({
            publicKeys: [publicKey],
        })

        expect(result).toEqual([
            {
                txId: 'req-1',
                status: 'rejected',
                publicKey,
                metadata: {
                    keyIdentifier: { id: 'wallet-key', publicKey },
                    signatureAlgorithm: 'EDDSA',
                    signatureType: 'RAW',
                    tsbStatus: 'CANCELLED',
                },
            },
        ])
    })

    it('cancelTransaction tolerates uncached transactions', async () => {
        const client = new SigningAPIClient('http://tsb.example')
        fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

        await client.cancelTransaction('req-1')

        expect(callsFor('/v1/request/req-1')).toHaveLength(1)
    })

    it('setConfiguration updates optional fields', () => {
        const tempDir = mkdtempSync(join(tmpdir(), 'tsb-mtls-'))
        const p12Path = join(tempDir, 'client.p12')
        writeFileSync(p12Path, 'dummy-p12')
        const client = new SigningAPIClient('http://tsb.example/')

        try {
            const config = client.setConfiguration({
                BaseURL: 'https://new.tsb/',
                KeyManagementApiKey: 'key',
                KeyOperationApiKey: 'operation',
                BearerToken: 'token',
                MtlsP12Path: p12Path,
                MtlsP12Password: 'mtls-secret',
                KeyPassword: 'secret',
                SignatureAlgorithm: 'SHA256_WITH_ECDSA',
            })

            expect(config).toMatchObject({
                BaseURL: 'https://new.tsb',
                KeyManagementApiKey: 'key',
                KeyOperationApiKey: 'operation',
                BearerToken: 'token',
                MtlsP12Path: p12Path,
                MtlsP12Password: 'mtls-secret',
                KeyPassword: 'secret',
                SignatureAlgorithm: 'SHA256_WITH_ECDSA',
            })
            expect(config).not.toHaveProperty('CreateKeyRequest')
            expect(config).not.toHaveProperty('SignatureType')
            expect(config).not.toHaveProperty('PayloadType')
            expect(config).not.toHaveProperty('PublicKeyFormat')
        } finally {
            rmSync(tempDir, { recursive: true, force: true })
        }
    })
})
