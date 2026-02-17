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

    /**
     * @param adapter The log adapter to use for output.
     * @private
     */
    private constructor(private readonly adapter: LogAdapter) {
        /**
         * Setup log level function calls for each allowed log level.
         */
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

    /**
     * Create a new logger instance with the specified adapter.
     * @param adapterCtr The adapter or adapter type to use.
     * @returns A new SdkLogger instance.
     */
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
