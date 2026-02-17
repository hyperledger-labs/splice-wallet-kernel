// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import ConsoleLogAdapter from './adapter/console'
import CustomLogAdapter from './adapter/custom'
import PinoLogAdapter from './adapter/pino'
import {
    AllowedLogAdapters,
    LogAdapter,
    LogContext,
    LoggerMethods,
    logLevels,
} from './types'

export class SdkLogger implements LoggerMethods {
    debug!: LoggerMethods['debug']
    error!: LoggerMethods['error']
    info!: LoggerMethods['info']
    warn!: LoggerMethods['warn']
    trace!: LoggerMethods['trace']

    private additionalContext = {}

    private constructor(private readonly adapter: LogAdapter) {
        // setup log level function calls
        logLevels.forEach((level) => {
            ;(this as SdkLogger)[level] = (
                ctx: LogContext,
                message?: string
            ) => {
                if (
                    !['debug', 'trace'].includes(level) ||
                    process.env.NODE_END === 'development'
                )
                    adapter.log(
                        level,
                        {
                            namespace: 'SDK',
                            ...this.additionalContext,
                            ...ctx,
                            timestamp: new Date().toISOString(),
                        },
                        message
                    )
            }
        })
    }

    public child(properties: Record<string, unknown>) {
        const childLogger = new SdkLogger(this.adapter)
        childLogger.additionalContext = properties
        return childLogger
    }

    public static create(adapterCtr?: AllowedLogAdapters) {
        if (adapterCtr instanceof CustomLogAdapter) {
            return new SdkLogger(adapterCtr)
        }

        let adapter
        switch (adapterCtr) {
            case 'console':
                adapter = new ConsoleLogAdapter()
                break
            case 'pino':
            default:
                adapter = new PinoLogAdapter()
        }

        return new SdkLogger(adapter)
    }
}
