// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { SDKErrorContext } from './types'

export class SDKError<OriginalErrorContext = undefined> extends Error {
    constructor(public context: SDKErrorContext<OriginalErrorContext>) {
        const { message, ...rest } = context
        super(message, rest)

        // Capture stack trace, excluding constructor call from stack
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor)
        }
    }

    public toJSON() {
        return {
            timestamp: this.timestamp,
            ...this.context,
        }
    }

    protected get timestamp() {
        return new Date().toISOString()
    }
}
