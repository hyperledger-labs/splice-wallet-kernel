// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { SpliceProvider } from '@canton-network/core-splice-provider'

export enum ErrorCode {
    ProviderNotFound,
    UserCancelled,
    Timeout,
    Other,
}

export type ConnectError = {
    status: 'error'
    error: ErrorCode
    details: string
}

export const assertProvider = (): SpliceProvider => {
    if (!window.canton) {
        throw {
            status: 'error',
            error: ErrorCode.ProviderNotFound,
            details:
                'Canton provider not found. Please install the Splice Wallet.',
        } as ConnectError
    }
    return window.canton
}
