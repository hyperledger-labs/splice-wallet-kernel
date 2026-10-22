// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { errorCodes, JsonRpcError } from '@canton-network/core-rpc-errors'

const ERROR_TITLES: Partial<Record<number, string>> = {
    [errorCodes.provider.userRejectedRequest]: 'User Rejected Request',
    [errorCodes.provider.unauthorized]: 'Unauthorized',
    [errorCodes.provider.unsupportedMethod]: 'Unsupported Method',
    [errorCodes.provider.disconnected]: 'Disconnected',
    [errorCodes.provider.chainDisconnected]: 'Chain Disconnected',
    [errorCodes.rpc.parse]: 'Parse Error',
    [errorCodes.rpc.invalidRequest]: 'Invalid Request',
    [errorCodes.rpc.methodNotFound]: 'Method Not Found',
    [errorCodes.rpc.invalidParams]: 'Invalid Parameters',
    [errorCodes.rpc.internal]: 'Internal Error',
    [errorCodes.rpc.invalidInput]: 'Invalid Input',
    [errorCodes.rpc.resourceNotFound]: 'Resource Not Found',
    [errorCodes.rpc.resourceUnavailable]: 'Resource Unavailable',
    [errorCodes.rpc.transactionRejected]: 'Transaction Rejected',
    [errorCodes.rpc.methodNotSupported]: 'Method Not Supported',
    [errorCodes.rpc.limitExceeded]: 'Limit Exceeded',
}

export type ErrorToastFallback = {
    message?: string
    buttonText?: string
    title?: string
}

/** Turns any thrown value into the text shown by an error toast */
export function getErrorToastContent(
    e: unknown,
    fallback?: ErrorToastFallback
): { title: string; message: string; buttonText: string } {
    const message = e instanceof Error ? e.message : ''
    const title = e instanceof JsonRpcError ? ERROR_TITLES[e.code] : undefined

    return {
        title: title || fallback?.title || 'Unexpected Error',
        message:
            message ||
            fallback?.message ||
            'Something went wrong. Please try again.',
        buttonText: fallback?.buttonText || 'Dismiss',
    }
}
