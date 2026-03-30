// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { SDKLogger } from '../logger/logger.js'
import { SDKError, SDKErrorContext } from './index.js'

export class SDKErrorHandler {
    constructor(private readonly logger: SDKLogger) {}

    public throw<OriginalErrorContext = undefined>(
        context: SDKErrorContext<OriginalErrorContext>,
        options: { gracefully: true }
    ): void

    public throw<OriginalErrorContext = undefined>(
        context: SDKErrorContext<OriginalErrorContext>,
        options?: { gracefully?: false }
    ): never

    public throw<OriginalErrorContext = undefined>(
        context: SDKErrorContext<OriginalErrorContext>,
        options?: Partial<{ gracefully: boolean }>
    ): void | never {
        const error = new SDKError(context)
        if (!options?.gracefully) throw error
        this.logger.error(error.toJSON())
    }
}
