// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    errorCodes,
    getMessageFromCode,
    JsonRpcError,
    serializeError,
    type OptionalDataWithOptionalCause,
} from '@metamask/rpc-errors'

export {
    rpcErrors,
    providerErrors,
    JsonRpcError,
    errorCodes,
    getMessageFromCode,
} from '@metamask/rpc-errors'

/** The EIP-1193 and EIP-1474 codes adopted by CIP-103, see https://github.com/canton-foundation/cips/blob/main/cip-0103/cip-0103.md */
const CIP103_ERROR_CODES: ReadonlySet<number> = new Set([
    ...Object.values(errorCodes.rpc),
    ...Object.values(errorCodes.provider),
])

export function isCip103ErrorCode(code: unknown): code is number {
    return typeof code === 'number' && CIP103_ERROR_CODES.has(code)
}

/** `serializeError` only keeps the code of objects without any extra key, so drop everything else first. */
function pickErrorFields(error: unknown): unknown {
    if (typeof error !== 'object' || error === null || !('code' in error))
        return error
    const { code, message, data } = error as Record<string, unknown>
    return data === undefined ? { code, message } : { code, message, data }
}

/** Converts a JSON-RPC error object or any other thrown value into a `JsonRpcError`, keeping its code. */
export function toJsonRpcError(
    error: unknown
): JsonRpcError<OptionalDataWithOptionalCause> {
    if (error instanceof JsonRpcError) return error
    // Non-JSON-RPC values become an internal error with the original in `data.cause`.
    const { code, message, data } = serializeError(pickErrorFields(error))
    return new JsonRpcError(code, message || getMessageFromCode(code), data)
}

export const toHttpErrorCode = (rpcCode: number): number => {
    const errorMap = {
        [errorCodes.rpc.parse]: 400,
        [errorCodes.rpc.invalidRequest]: 400,
        [errorCodes.rpc.methodNotFound]: 404,
        [errorCodes.rpc.invalidParams]: 400,
        [errorCodes.rpc.invalidInput]: 400,
        [errorCodes.provider.unauthorized]: 401,
        [errorCodes.rpc.internal]: 500,
    }

    return errorMap[rpcCode] || 500
}
