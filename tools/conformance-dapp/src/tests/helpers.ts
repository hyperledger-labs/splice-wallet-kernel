// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod'
import { errorCodes, isCip103ErrorCode } from '@canton-network/core-rpc-errors'

const userUrl = z.url()
export const providerSchema = z.object({
    id: z.string().min(1),
    version: z.string().optional(),
    providerType: z.enum(['browser', 'desktop', 'mobile', 'remote']),
    url: z.string().optional(),
    userUrl: userUrl.optional(),
})
export const connectResultSchema = z.object({
    isConnected: z.boolean(),
    isNetworkConnected: z.boolean(),
    reason: z.string().optional(),
    networkReason: z.string().optional(),
    userUrl: userUrl.optional(),
})
export const networkSchema = z.object({
    networkId: z.string().min(1),
    ledgerApi: z.url().optional(),
    accessToken: z.string().optional(),
})
export const statusEventSchema = z.object({
    provider: providerSchema,
    connection: connectResultSchema,
    network: networkSchema.optional(),
    session: z
        .object({
            accessToken: z.string().min(1),
            userId: z.string().min(1),
        })
        .optional(),
})
export const signMessageResultSchema = z.object({
    signature: z.string().min(1),
})

const commandId = z.string().min(1)
export const txChangedEventSchema = z.discriminatedUnion('status', [
    z.object({ status: z.literal('pending'), commandId }),
    z.object({
        status: z.literal('signed'),
        commandId,
        payload: z.object({
            signature: z.string().min(1),
            signedBy: z.string().min(1),
            party: z.string().min(1),
        }),
    }),
    z.object({
        status: z.literal('executed'),
        commandId,
        payload: z.object({
            updateId: z.string().min(1),
            completionOffset: z.number().int(),
        }),
    }),
    z.object({ status: z.literal('failed'), commandId }),
])
export const walletSchema = z.object({
    primary: z.boolean(),
    partyId: z.string().min(1),
    status: z.enum(['initialized', 'allocated', 'removed']),
    hint: z.string(),
    publicKey: z.string().min(1),
    namespace: z.string().min(1),
    networkId: z.string().min(1),
    signingProviderId: z.string().min(1),
    externalTxId: z.string().optional(),
    topologyTransactions: z.string().optional(),
    disabled: z.boolean().optional(),
    reason: z.string().optional(),
})

export function describeError(error: unknown): string {
    if (error instanceof z.ZodError) return z.prettifyError(error)
    if (error instanceof Error) return error.message
    if (typeof error !== 'object' || error === null) return String(error)
    return JSON.stringify(error, Object.getOwnPropertyNames(error))
}

// Error codes are only loosely specified in CIP-103, so the suite allows multiple codes for the same logical error.
export const INVALID_PARAMS_CODES = [
    errorCodes.rpc.invalidParams,
    errorCodes.rpc.invalidInput,
] as const
export const UNKNOWN_METHOD_CODES = [
    errorCodes.provider.unsupportedMethod,
    errorCodes.rpc.methodNotFound,
    errorCodes.rpc.methodNotSupported,
] as const
export const USER_REJECTED_CODES = [
    errorCodes.provider.userRejectedRequest,
] as const
// A wallet may only learn that the transaction failed, not that the user rejected it.
export const REJECTED_TRANSACTION_CODES = [
    errorCodes.provider.userRejectedRequest,
    errorCodes.rpc.transactionRejected,
] as const
export const UNAUTHORIZED_CODES = [errorCodes.provider.unauthorized] as const
export const NO_NETWORK_CODES = [
    errorCodes.provider.chainDisconnected,
    errorCodes.provider.disconnected,
] as const

export function requireCondition(
    condition: unknown,
    message: string
): asserts condition {
    if (!condition) throw new Error(message)
}

export function isWalletError(error: unknown): error is { code: number } {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        isCip103ErrorCode(error.code)
    )
}

export async function expectRejection(
    operation: Promise<unknown>,
    codes: readonly number[] = USER_REJECTED_CODES
): Promise<void> {
    try {
        await operation
    } catch (error) {
        if (!isWalletError(error)) throw error
        requireCondition(
            codes.includes(error.code),
            `Expected wallet error code ${codes.join(' or ')}, received ${error.code}`
        )
        return
    }
    throw new Error('Expected wallet rejection, but the request succeeded')
}
