// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

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
