// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import ConsoleLogAdapter from './adapter/console'
import PinoLogAdapter from './adapter/pino'
import {
    AllowedLogAdapters,
    LogAdapter,
    LogContext,
    LoggerMethods,
    logLevels,
} from './types'

/**
 * Logger implementation supporting multiple adapters and contextual logging.
 */
export class SdkLogger implements LoggerMethods {
    debug!: LoggerMethods['debug']
    error!: LoggerMethods['error']
    info!: LoggerMethods['info']
    warn!: LoggerMethods['warn']
    trace!: LoggerMethods['trace']

    /**
     * Additional context for child loggers.
     * @private
     */
    private additionalContext = {}

    private readonly adapter: LogAdapter

    /**
     * @param adapter The log adapter to use for output.
     */
    constructor(private readonly allowedAdapter: AllowedLogAdapters) {
        switch (allowedAdapter) {
            case 'console':
                this.adapter = new ConsoleLogAdapter()
                break
            case 'pino':
                this.adapter = new PinoLogAdapter()
                break
            default:
                this.adapter = allowedAdapter
        }

        /**
         * Setup log level function calls for each allowed log level.
         */
        logLevels.forEach((level) => {
            ;(this as SdkLogger)[level] = (
                ctxOrMessage: LogContext | string,
                message?: string
            ) => {
                if (
                    !['debug', 'trace'].includes(level) ||
                    process.env.NODE_ENV === 'development'
                ) {
                    if (typeof ctxOrMessage === 'string') {
                        this.adapter.log(
                            level,
                            {
                                namespace: 'SDK',
                                ...this.additionalContext,
                                timestamp: new Date().toISOString(),
                            },
                            ctxOrMessage
                        )
                    } else {
                        this.adapter.log(
                            level,
                            {
                                namespace: 'SDK',
                                ...this.additionalContext,
                                ...ctxOrMessage,
                                timestamp: new Date().toISOString(),
                            },
                            message
                        )
                    }
                }
            }
        })
    }

    /**
     * Create a child logger with additional context (e.g., namespace).
     *
     * @param properties Context properties to add to all logs from the child logger.
     * @returns A new SdkLogger instance with merged context.
     *
     * @example
     * // Create a logger with a namespace for a specific module
     * const childLogger = logger.child({ namespace: 'MyModule' });
     * logger.info({}, 'Hello from MyModule');
     */
    public child(properties: Record<string, unknown>) {
        const childLogger = new SdkLogger(this.adapter)
        childLogger.additionalContext = properties
        return childLogger
    }
}
