// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { AbstractLedgerProvider } from '@canton-network/core-provider-ledger'
import type { SDKLogger } from '../../logger/logger.js'
import type { SDKErrorHandler } from '../../error/handler.js'

export type SDKContext = {
    ledgerProvider: AbstractLedgerProvider
    userId: string
    logger: SDKLogger
    error: SDKErrorHandler
    /**
     * Synchronizer used by calls that do not name one. Set from the
     * `synchronizerId` option of `SDK.create`, or from the only connected
     * synchronizer. Undefined when the participant is connected to several and
     * the caller did not pick one — such calls must pass a synchronizerId.
     */
    synchronizerId: string | undefined
    /** Synchronizers the participant was connected to when the SDK was created. */
    connectedSynchronizerIds?: readonly string[]
}

export type OfflineSDKContext = {
    logger: SDKLogger
    error: SDKErrorHandler
}
