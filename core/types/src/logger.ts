// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { getLogger, type Logger, type LogLevel } from '@logtape/logtape'

interface ConditionalLogger extends Logger {
    conditional: (
        message: string,
        info: Record<string, unknown>,
        debug: Record<string, unknown>
    ) => void
    with: (properties: Record<string, unknown>) => ConditionalLogger
}

const wrap = (logger: Logger): ConditionalLogger => {
    const extras = {
        conditional: (
            message: string,
            base: Record<string, unknown>,
            extra?: Record<string, unknown>,
            level: LogLevel = 'debug'
        ) => {
            if (logger.isEnabledFor(level)) {
                logger.info(message, { ...base, ...extra })
            } else {
                logger.info(message, base)
            }
        },
        with: (properties: Record<string, unknown>) =>
            wrap(logger.with(properties)),
    }

    // Logger uses private fields, so methods must be bound to the real instance
    return new Proxy(logger, {
        get(target, prop) {
            if (prop in extras) return extras[prop as keyof typeof extras]
            const value = Reflect.get(target, prop, target)
            return typeof value === 'function' ? value.bind(target) : value
        },
    }) as ConditionalLogger
}

export const getLoggerConditional = (
    category?: string | readonly string[] | undefined
): ConditionalLogger => wrap(getLogger(category))
