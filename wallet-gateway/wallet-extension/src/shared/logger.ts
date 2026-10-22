// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    configureSync,
    defaultConsoleFormatter,
    getConsoleSink,
    getLogger,
} from '@logtape/logtape'

// Routes every LogTape logger in this context, including the core libraries',
// to the console. `reset` allows re-evaluation (e.g. on HMR).
configureSync({
    reset: true,
    sinks: {
        // DevTools-styled output, with the record's properties appended as an
        // inspectable object (the default formatter drops unreferenced ones).
        console: getConsoleSink({
            formatter: (record) => {
                const args = defaultConsoleFormatter(record)
                return Object.keys(record.properties).length > 0
                    ? [...args, record.properties]
                    : args
            },
        }),
    },
    loggers: [
        {
            category: [],
            sinks: ['console'],
            lowestLevel:
                import.meta.env.MODE === 'test'
                    ? null
                    : import.meta.env.PROD
                      ? 'warning'
                      : 'debug',
        },
    ],
})

/** Root logger for the whole wallet extension. */
export const logger = getLogger('wallet-ext')
