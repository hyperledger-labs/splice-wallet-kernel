// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { DappProvider } from '@canton-network/core-provider-dapp'

export enum ErrorCode {
    ProviderNotFound,
    UserCancelled,
    Timeout,
    TransactionFailed,
    Other,
}

export type ConnectError = {
    status: 'error'
    error: ErrorCode
    details: string
}

export const assertProvider = (): DappProvider => {
    if (!window.canton) {
        throw {
            status: 'error',
            error: ErrorCode.ProviderNotFound,
            details:
                'Canton provider not found. Please install the Splice Wallet.',
        } as ConnectError
    }
    return window.canton as DappProvider
}
