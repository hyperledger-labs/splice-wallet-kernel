// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LogAdapter, LogContext, LogLevel } from '../types'
import pino from 'pino'

export default class PinoLogAdapter implements LogAdapter {
    private readonly pino: pino.Logger

    constructor() {
        this.pino = pino({
            level: process.env.NODE_ENV === 'development' ? 'trace' : 'info',
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                },
            },
        })
    }

    public log(type: LogLevel, ctx: LogContext, message?: string) {
        const { namespace, ...rest } = ctx
        const slash = namespace && message ? '/' : ''
        const messageWithNamespace = `(${namespace ?? ''})${slash}${message ?? ''}`
        this.pino[type](rest, messageWithNamespace)
    }
}
