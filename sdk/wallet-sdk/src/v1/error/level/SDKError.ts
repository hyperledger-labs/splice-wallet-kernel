// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { SDKErrorType } from '../types'

export class SDKError<Context extends ErrorOptions> extends Error {
    constructor(
        public message: string,
        public type: SDKErrorType = 'SDKOperationUnsupported',
        public context?: Context
    ) {
        super(message, context)

        // Capture stack trace, excluding constructor call from stack
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor)
        }
    }

    public toJSON() {
        return {
            message: this.message,
            timestamp: this.timestamp,
            ...this.context,
        }
    }

    protected get timestamp() {
        return new Date().toISOString()
    }
}
