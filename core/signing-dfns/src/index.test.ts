// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, test, vi } from 'vitest'

import {
    isRpcError,
    SigningProvider,
    PartyMode,
    type Key,
    type Error as RpcError,
} from '@canton-network/core-signing-lib'

import DfnsSigningDriver, { type DfnsCredentials } from './index.js'
import type { DfnsKey, DfnsSignature } from './dfns.js'

const TEST_USER_ID = 'test-user-id'
const TEST_KEY_ID = 'key-test-1'
const TEST_KEY_NAME = 'canton-key'
const TEST_PUBLIC_KEY = 'dGVzdC1wdWJsaWMta2V5'
const TEST_TX_HASH = 'dGVzdC10eC1oYXNo'
const TEST_SIG_ID = 'sig-test-1'
const TEST_SIGNATURE = 'dGVzdC1zaWduYXR1cmU='

const TEST_KEY: DfnsKey = {
    id: TEST_KEY_ID,
    name: TEST_KEY_NAME,
    publicKey: TEST_PUBLIC_KEY,
}

const SIGNED_SIG: DfnsSignature = {
    id: TEST_SIG_ID,
    keyId: TEST_KEY_ID,
    status: 'signed',
    signature: TEST_SIGNATURE,
}

const PENDING_SIG: DfnsSignature = {
    id: 'sig-other',
    keyId: TEST_KEY_ID,
    status: 'pending',
}

const dfnsHandlerMock = vi.hoisted(() => ({
    findKeyByPublicKey: vi.fn(),
    signHash: vi.fn(),
    signMessage: vi.fn(),
    findSignature: vi.fn(),
    getKey: vi.fn(),
    iterateKeys: vi.fn(),
    listSignatures: vi.fn(),
    listKeys: vi.fn(),
    createKey: vi.fn(),
}))

vi.mock('./dfns.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./dfns.js')>()
    return {
        ...actual,
        DfnsHandler: vi.fn(function DfnsHandler() {
            return dfnsHandlerMock
        }),
    }
})

function createTestDriver() {
    const credentials: DfnsCredentials = {
        credId: 'test-cred-id',
        privateKey:
            '-----BEGIN EC PRIVATE KEY-----\ntest\n-----END EC PRIVATE KEY-----',
        authToken:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcmdJZCI6Im9yLXRlc3Qtb3JnLWlkIn0.test',
    }

    return new DfnsSigningDriver({
        orgId: 'or-test-org-id',
        baseUrl: 'https://api.dfns.io',
        credentials,
    })
}

function mockHandlerDefaults() {
    dfnsHandlerMock.findKeyByPublicKey.mockResolvedValue(TEST_KEY)
    dfnsHandlerMock.signHash.mockResolvedValue(SIGNED_SIG)
    dfnsHandlerMock.signMessage.mockResolvedValue(SIGNED_SIG)
    dfnsHandlerMock.findSignature.mockResolvedValue(SIGNED_SIG)
    dfnsHandlerMock.getKey.mockResolvedValue(TEST_KEY)
    dfnsHandlerMock.listKeys.mockResolvedValue([TEST_KEY])
    dfnsHandlerMock.createKey.mockResolvedValue(TEST_KEY)
    dfnsHandlerMock.iterateKeys.mockImplementation(async function* () {
        yield TEST_KEY
    })
    dfnsHandlerMock.listSignatures.mockImplementation(async function* () {
        yield SIGNED_SIG
        yield PENDING_SIG
    })
}

export function assertNotRpcError<T>(value: T | RpcError): asserts value is T {
    if (isRpcError(value)) {
        throw new Error(
            `Expected a successful RPC result, got: ${value.error_description}`
        )
    }
}

describe('DfnsSigningDriver', () => {
    beforeEach(() => {
        mockHandlerDefaults()
    })

    test('has correct signing provider', () => {
        const driver = createTestDriver()
        expect(driver.signingProvider).toBe(SigningProvider.DFNS)
    })

    test('has external party mode', () => {
        const driver = createTestDriver()
        expect(driver.partyMode).toBe(PartyMode.EXTERNAL)
    })

    test('controller returns methods object', () => {
        const driver = createTestDriver()
        const controller = driver.controller(TEST_USER_ID)

        expect(controller.signTransaction).toBeDefined()
        expect(controller.getTransaction).toBeDefined()
        expect(controller.getTransactions).toBeDefined()
        expect(controller.getKeys).toBeDefined()
        expect(controller.createKey).toBeDefined()
        expect(controller.getConfiguration).toBeDefined()
        expect(controller.setConfiguration).toBeDefined()
        expect(controller.subscribeTransactions).toBeDefined()
    })

    test('signTransaction signs with key id', async () => {
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.signTransaction({
            tx: 'ignored',
            txHash: TEST_TX_HASH,
            keyIdentifier: { id: TEST_KEY_ID },
        })

        assertNotRpcError(result)
        expect(result.txId).toBe(TEST_SIG_ID)
        expect(result.status).toBe('signed')
        expect(result.signature).toBe(TEST_SIGNATURE)
        expect(dfnsHandlerMock.signHash).toHaveBeenCalledWith(
            TEST_KEY_ID,
            TEST_TX_HASH,
            undefined
        )
        expect(dfnsHandlerMock.findKeyByPublicKey).not.toHaveBeenCalled()
    })

    test('signTransaction resolves key by public key', async () => {
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.signTransaction({
            tx: 'ignored',
            txHash: TEST_TX_HASH,
            keyIdentifier: { publicKey: TEST_PUBLIC_KEY },
            internalTxId: 'internal-1',
        })

        assertNotRpcError(result)
        expect(result.publicKey).toBe(TEST_PUBLIC_KEY)
        expect(dfnsHandlerMock.findKeyByPublicKey).toHaveBeenCalledWith(
            TEST_PUBLIC_KEY
        )
        expect(dfnsHandlerMock.signHash).toHaveBeenCalledWith(
            TEST_KEY_ID,
            TEST_TX_HASH,
            'internal-1'
        )
    })

    test('signTransaction returns key_not_found when key cannot be resolved', async () => {
        dfnsHandlerMock.findKeyByPublicKey.mockResolvedValue(undefined)
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.signTransaction({
            tx: 'ignored',
            txHash: TEST_TX_HASH,
            keyIdentifier: { publicKey: 'unknown' },
        })

        expect(isRpcError(result)).toBe(true)
        if (isRpcError(result)) {
            expect(result.error).toBe('key_not_found')
        }
    })

    test('signTransaction returns key_not_found when key identifier is empty', async () => {
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.signTransaction({
            tx: 'ignored',
            txHash: TEST_TX_HASH,
            // @ts-expect-error if type checking isn't circumvented, this should not happen
            keyIdentifier: {},
        })

        expect(isRpcError(result)).toBe(true)
        if (isRpcError(result)) {
            expect(result.error).toBe('key_not_found')
        }
        expect(dfnsHandlerMock.findKeyByPublicKey).not.toHaveBeenCalled()
    })

    test('signTransaction returns bad_arguments when txHash is missing', async () => {
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.signTransaction({
            tx: 'ignored',
            txHash: '',
            keyIdentifier: { id: TEST_KEY_ID },
        })

        expect(isRpcError(result)).toBe(true)
        if (isRpcError(result)) {
            expect(result.error).toBe('bad_arguments')
        }
    })

    test('signTransaction returns signing_error when Dfns fails', async () => {
        dfnsHandlerMock.signHash.mockRejectedValue(new Error('sign failed'))
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.signTransaction({
            tx: 'ignored',
            txHash: TEST_TX_HASH,
            keyIdentifier: { id: TEST_KEY_ID },
        })

        expect(isRpcError(result)).toBe(true)
        if (isRpcError(result)) {
            expect(result.error).toBe('signing_error')
            expect(result.error_description).toBe('sign failed')
        }
    })

    test('signMessage signs the UTF-8 string and returns a signed status', async () => {
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.signMessage({
            message: 'header.payload',
            keyIdentifier: { id: TEST_KEY_ID },
            internalTxId: 'msg-1',
        })

        assertNotRpcError(result)
        expect(result).toEqual({
            txId: TEST_SIG_ID,
            status: 'signed',
            signature: TEST_SIGNATURE,
        })
        expect(dfnsHandlerMock.signMessage).toHaveBeenCalledWith(
            TEST_KEY_ID,
            'header.payload',
            'msg-1'
        )
    })

    test('signMessage returns bad_arguments when the message is empty', async () => {
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.signMessage({
            message: '',
            keyIdentifier: { id: TEST_KEY_ID },
        })

        expect(isRpcError(result)).toBe(true)
        if (isRpcError(result)) {
            expect(result.error).toBe('bad_arguments')
        }
        expect(dfnsHandlerMock.signMessage).not.toHaveBeenCalled()
    })

    test('signMessage returns key_not_found when key cannot be resolved', async () => {
        dfnsHandlerMock.findKeyByPublicKey.mockResolvedValue(undefined)
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.signMessage({
            message: 'hello',
            keyIdentifier: { publicKey: 'unknown' },
        })

        expect(isRpcError(result)).toBe(true)
        if (isRpcError(result)) {
            expect(result.error).toBe('key_not_found')
        }
        expect(dfnsHandlerMock.signMessage).not.toHaveBeenCalled()
    })

    test('signMessage returns signing_error when handler throws fails', async () => {
        dfnsHandlerMock.signMessage.mockRejectedValue(new Error('sign failed'))
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.signMessage({
            message: 'hello',
            keyIdentifier: { id: TEST_KEY_ID },
        })

        expect(isRpcError(result)).toBe(true)
        if (isRpcError(result)) {
            expect(result.error).toBe('signing_error')
            expect(result.error_description).toBe('sign failed')
        }
    })

    test('signMessage returns pending status with txId without error', async () => {
        dfnsHandlerMock.signMessage.mockResolvedValue(PENDING_SIG)
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.signMessage({
            message: 'hello',
            keyIdentifier: { id: TEST_KEY_ID },
        })

        assertNotRpcError(result)
        expect(result).toEqual({
            txId: PENDING_SIG.id,
            status: 'pending',
        })
    })

    test('signMessage returns rejected status with txId without error', async () => {
        dfnsHandlerMock.signMessage.mockResolvedValue({
            ...PENDING_SIG,
            status: 'rejected',
        })
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.signMessage({
            message: 'hello',
            keyIdentifier: { id: TEST_KEY_ID },
        })

        assertNotRpcError(result)
        expect(result).toEqual({
            txId: PENDING_SIG.id,
            status: 'rejected',
        })
    })

    test('signTransaction omits optional signature on pending result', async () => {
        dfnsHandlerMock.signHash.mockResolvedValue({
            id: TEST_SIG_ID,
            keyId: TEST_KEY_ID,
            status: 'pending',
        })
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.signTransaction({
            tx: 'ignored',
            txHash: TEST_TX_HASH,
            keyIdentifier: { id: TEST_KEY_ID },
        })

        assertNotRpcError(result)
        expect(result.signature).toBeUndefined()
    })

    test('getTransaction returns signature with public key from key lookup', async () => {
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.getTransaction({ txId: TEST_SIG_ID })

        assertNotRpcError(result)
        expect(result.txId).toBe(TEST_SIG_ID)
        expect(result.publicKey).toBe(TEST_PUBLIC_KEY)
        expect(dfnsHandlerMock.findSignature).toHaveBeenCalledWith(TEST_SIG_ID)
        expect(dfnsHandlerMock.getKey).toHaveBeenCalledWith(TEST_KEY_ID)
    })

    test('getTransaction returns transaction_not_found when signature is missing', async () => {
        dfnsHandlerMock.findSignature.mockResolvedValue(undefined)
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.getTransaction({ txId: 'missing' })

        expect(isRpcError(result)).toBe(true)
        if (isRpcError(result)) {
            expect(result.error).toBe('transaction_not_found')
        }
    })

    test('getTransaction returns fetch_error when lookup fails', async () => {
        dfnsHandlerMock.findSignature.mockRejectedValue(new Error('api down'))
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.getTransaction({ txId: TEST_SIG_ID })

        expect(isRpcError(result)).toBe(true)
        if (isRpcError(result)) {
            expect(result.error).toBe('fetch_error')
        }
    })

    test('getTransaction omits publicKey when key lookup returns undefined', async () => {
        dfnsHandlerMock.getKey.mockResolvedValue(undefined)
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.getTransaction({ txId: TEST_SIG_ID })

        assertNotRpcError(result)
        expect(result.publicKey).toBeUndefined()
    })

    test('getTransactions requires filters', async () => {
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.getTransactions({})

        expect(isRpcError(result)).toBe(true)
        if (isRpcError(result)) {
            expect(result.error).toBe('bad_arguments')
        }
    })

    test('getTransactions filters by publicKeys', async () => {
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.getTransactions({
            publicKeys: [TEST_PUBLIC_KEY],
        })

        assertNotRpcError(result)
        expect(result.transactions).toHaveLength(2)
        expect(
            result.transactions?.every((t) => t.publicKey === TEST_PUBLIC_KEY)
        ).toBe(true)
        expect(dfnsHandlerMock.listSignatures).toHaveBeenCalledTimes(1)
        expect(dfnsHandlerMock.listSignatures).toHaveBeenCalledWith(TEST_KEY_ID)
    })

    test('getTransactions skips keys that do not match publicKeys filter', async () => {
        dfnsHandlerMock.iterateKeys.mockImplementation(async function* () {
            yield { ...TEST_KEY, id: 'key-2', publicKey: 'other-pk' }
            yield TEST_KEY
        })
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.getTransactions({
            publicKeys: [TEST_PUBLIC_KEY],
        })

        assertNotRpcError(result)
        expect(result.transactions).toHaveLength(2)
        expect(dfnsHandlerMock.listSignatures).toHaveBeenCalledTimes(1)
        expect(dfnsHandlerMock.listSignatures).toHaveBeenCalledWith(TEST_KEY_ID)
    })

    test('getTransactions filters by txIds', async () => {
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.getTransactions({
            txIds: [TEST_SIG_ID],
        })

        assertNotRpcError(result)
        expect(result.transactions).toHaveLength(1)
        expect(result.transactions?.[0]?.txId).toBe(TEST_SIG_ID)
    })

    test('getTransactions ignores signatures that do not match txIds', async () => {
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.getTransactions({
            txIds: [PENDING_SIG.id],
        })

        assertNotRpcError(result)
        expect(result.transactions).toHaveLength(1)
        expect(result.transactions?.[0]?.txId).toBe(PENDING_SIG.id)
    })

    test('getTransactions stops early when all txIds are found', async () => {
        let listCalls = 0
        dfnsHandlerMock.listSignatures.mockImplementation(async function* () {
            listCalls += 1
            yield SIGNED_SIG
            yield PENDING_SIG
        })
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.getTransactions({
            txIds: [TEST_SIG_ID],
        })

        assertNotRpcError(result)
        expect(result.transactions).toHaveLength(1)
        expect(listCalls).toBe(1)
    })

    test('getTransactions returns fetch_error when listing fails', async () => {
        // oxlint-disable-next-line require-yield
        dfnsHandlerMock.iterateKeys.mockImplementation(async function* () {
            throw new Error('list failed')
        })
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.getTransactions({
            txIds: [TEST_SIG_ID],
        })

        expect(isRpcError(result)).toBe(true)
        if (isRpcError(result)) {
            expect(result.error).toBe('fetch_error')
        }
    })

    test('getKeys returns mapped keys', async () => {
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.getKeys()

        assertNotRpcError(result)
        const keys = result.keys as Key[]
        expect(keys).toHaveLength(1)
        expect(keys[0]).toEqual({
            id: TEST_KEY_ID,
            name: TEST_KEY_NAME,
            publicKey: TEST_PUBLIC_KEY,
        })
    })

    test('getKeys returns fetch_error when listing fails', async () => {
        dfnsHandlerMock.listKeys.mockRejectedValue(new Error('keys failed'))
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.getKeys()

        expect(isRpcError(result)).toBe(true)
        if (isRpcError(result)) {
            expect(result.error).toBe('fetch_error')
        }
    })

    test('createKey returns created key', async () => {
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.createKey({ name: TEST_KEY_NAME })

        assertNotRpcError(result)
        expect(result).toMatchObject({
            id: TEST_KEY_ID,
            name: TEST_KEY_NAME,
            publicKey: TEST_PUBLIC_KEY,
        })
    })

    test('createKey returns creation_error when API call fails', async () => {
        dfnsHandlerMock.createKey.mockRejectedValue(
            new Error('Provided auth token is not scoped')
        )
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.createKey({ name: 'test-wallet' })

        expect(isRpcError(result)).toBe(true)
        if (isRpcError(result)) {
            expect(result.error).toBe('creation_error')
        }
    })

    test('getConfiguration roundtrips for setConfiguration', async () => {
        const controller = createTestDriver().controller(TEST_USER_ID)
        const config = await controller.getConfiguration()

        expect(config.orgId).toBe('or-test-org-id')
        expect(config.baseUrl).toBe('https://api.dfns.io')
        expect(config.credentials.credId).toBe('test-cred-id')
        expect(config.credentials.privateKey).toContain('BEGIN EC PRIVATE KEY')
        expect(config.credentials.authToken).toContain('eyJ')

        const result = await controller.setConfiguration(config)
        assertNotRpcError(result)
    })

    test('setConfiguration validates orgId', async () => {
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.setConfiguration({
            orgId: '',
            baseUrl: 'https://api.dfns.io',
            credentials: {
                credId: 'c',
                privateKey: 'p',
                authToken: 'a',
            },
        })

        expect(isRpcError(result)).toBe(true)
    })

    test('setConfiguration validates baseUrl', async () => {
        const controller = createTestDriver().controller(TEST_USER_ID)
        const result = await controller.setConfiguration({
            orgId: 'or-test-org-id',
            baseUrl: 'not-a-valid-url',
            credentials: {
                credId: 'c',
                privateKey: 'p',
                authToken: 'a',
            },
        })

        expect(isRpcError(result)).toBe(true)
    })

    test('setConfiguration accepts valid config', async () => {
        const controller = createTestDriver().controller(TEST_USER_ID)
        const validConfig = {
            orgId: 'or-new-org-id',
            baseUrl: 'https://api.dfns.io',
            credentials: {
                credId: 'new-cred',
                privateKey: 'new-key',
                authToken: 'new-token',
            },
        }

        const result = await controller.setConfiguration(validConfig)
        assertNotRpcError(result)
        expect(result.orgId).toBe('or-new-org-id')

        const config = await controller.getConfiguration()
        expect(config.orgId).toBe('or-new-org-id')
    })
})
