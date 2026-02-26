// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsCantonError } from '@canton-network/core-ledger-client'
import { SDKError } from './SDKError'

export class CantonError extends SDKError<JsCantonError> {
    constructor(
        public message: string = 'Canton Error',
        public context?: JsCantonError
    ) {
        super(message, 'CantonError', context)
    }
}
