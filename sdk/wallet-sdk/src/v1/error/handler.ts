// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { SDKLogger } from '../logger/logger.js'
import { SDKError, SDKErrorType } from './index.js'
import { CantonError } from './level/CantonError.js'

export class SDKErrorHandler {
    constructor(private readonly logger: SDKLogger) {}

    public throw<const Type extends SDKErrorType, Context extends ErrorOptions>(
        type: Type,
        context?: Context
    ) {
        let error: SDKError<Context>
        switch (type) {
            case 'CantonError':
                error = new CantonError('Canton Error:', context)
                break
            case 'Unauthorized':
                break
            case 'NotFound':
                break
            case 'ValidationFailed':
                break
            case 'NetworkError':
                break
            case 'SDKOperationUnsupported':
                break
            default:
                throw new SDKError(
                    `Unhandled exception: ${type satisfies never}`
                )
        }

        this.logger.error(error.toJSON())
    }
}
