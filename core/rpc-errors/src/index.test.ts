// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import {
    errorCodes,
    getMessageFromCode,
    isCip103ErrorCode,
    JsonRpcError,
    providerErrors,
    rpcErrors,
    toHttpErrorCode,
    toJsonRpcError,
} from './index'

describe('core/rpc-errors', () => {
    /** Pins the table in https://github.com/canton-foundation/cips/blob/main/cip-0103/cip-0103.md */
    it('recognizes exactly the codes CIP-103 defines', () => {
        const cip103Codes = [
            4001, 4100, 4200, 4900, 4901, -32700, -32600, -32601, -32602,
            -32603, -32000, -32001, -32002, -32003, -32004, -32005,
        ]
        expect(
            new Set([
                ...Object.values(errorCodes.rpc),
                ...Object.values(errorCodes.provider),
            ])
        ).toStrictEqual(new Set(cip103Codes))
        for (const code of cip103Codes)
            expect(isCip103ErrorCode(code)).toBe(true)
        expect(isCip103ErrorCode(9999)).toBe(false)
        expect(isCip103ErrorCode('4001')).toBe(false)
    })

    it.each([
        [
            'a JSON-RPC error object',
            { code: 4001, message: 'Rejected', data: 'x' },
            { code: 4001, message: 'Rejected', data: 'x' },
        ],
        [
            'an error object with extra keys',
            { code: 4001, message: 'Rejected', stack: 'at wallet' },
            { code: 4001, message: 'Rejected' },
        ],
        [
            'an error object with undefined data',
            { code: 4001, message: 'Rejected', data: undefined },
            { code: 4001, message: 'Rejected' },
        ],
        [
            'an error without a message',
            { code: -32003, message: '' },
            {
                code: errorCodes.rpc.transactionRejected,
                message: getMessageFromCode(errorCodes.rpc.transactionRejected),
            },
        ],
        [
            'a code outside CIP-103',
            { code: 500, message: 'Internal Server Error' },
            { code: 500, message: 'Internal Server Error' },
        ],
        [
            'a plain Error',
            new Error('boom'),
            { code: errorCodes.rpc.internal, message: 'boom' },
        ],
    ])('normalizes %s', (_, input, expected) => {
        const error = toJsonRpcError(input)
        expect(error).toBeInstanceOf(JsonRpcError)
        expect(error).toMatchObject(expected)
    })

    it('passes JSON-RPC errors through unchanged', () => {
        const error = providerErrors.userRejectedRequest()
        expect(toJsonRpcError(error)).toBe(error)
    })

    it('should map the correct codes', () => {
        expect(toHttpErrorCode(rpcErrors.parse().code)).toBe(400)
        expect(toHttpErrorCode(rpcErrors.invalidRequest().code)).toBe(400)
        expect(toHttpErrorCode(rpcErrors.methodNotFound().code)).toBe(404)
        expect(toHttpErrorCode(rpcErrors.invalidParams().code)).toBe(400)
        expect(toHttpErrorCode(rpcErrors.invalidInput().code)).toBe(400)
        expect(toHttpErrorCode(providerErrors.unauthorized().code)).toBe(401)
        expect(toHttpErrorCode(rpcErrors.internal().code)).toBe(500)
        expect(toHttpErrorCode(9999)).toBe(500) // Unmapped code should default to 500
    })
})
