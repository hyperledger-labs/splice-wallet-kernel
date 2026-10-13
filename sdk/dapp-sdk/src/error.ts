// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/** @deprecated No longer emitted; errors are `JsonRpcError`s with a code from `errorCodes` in `@canton-network/core-rpc-errors`. */
export enum ErrorCode {
    ProviderNotFound,
    UserCancelled,
    Timeout,
    TransactionFailed,
    Other,
}
