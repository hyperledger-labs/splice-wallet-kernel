// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type SDKErrorType =
    | 'Unauthorized'
    | 'NotFound'
    | 'ValidationFailed'
    | 'NetworkError'
    | 'CantonError'
    | 'SDKOperationUnsupported'

export type SDKErrorContext<OriginalError = undefined> = ErrorOptions & {
    message: string
    type: SDKErrorType
    originalError?: OriginalError
}
