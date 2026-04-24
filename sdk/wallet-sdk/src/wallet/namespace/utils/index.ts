// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { HashNamespace } from './hash/service.js'
import { PingService } from './ping/index.js'
import { SDKLogger } from '../../logger/logger.js'
import { LogAdapter } from '../../logger/types.js'
import { SDKErrorHandler } from '../../error/index.js'

export class SDKUtilsNamespace {
    public readonly ping: PingService
    public readonly hash: HashNamespace
    constructor(logAdapter?: LogAdapter) {
        const logger = new SDKLogger(logAdapter ?? 'pino')
        const error = new SDKErrorHandler(logger)
        const ctx = {
            logger,
            error,
        }
        this.ping = new PingService()
        this.hash = new HashNamespace(ctx)
    }
}
