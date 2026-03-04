// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LogAdapter, LogContext, LogLevel } from '../types'

export default class ConsoleLogAdapter implements LogAdapter {
    log(type: LogLevel, ctx: LogContext, message?: string): void {
        const { namespace, ...rest } = ctx
        const slash = namespace && message ? '/' : ''
        const colon = namespace || message ? ':' : ''
        const namespaceAndMessage =
            namespace || message
                ? `${colon}(${namespace ?? ''})${slash}${message ?? ''}`
                : ''

        console[type](
            `${type.toLocaleUpperCase()}${namespaceAndMessage}:`,
            rest
        )
    }
}
