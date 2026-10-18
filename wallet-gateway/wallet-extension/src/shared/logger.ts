// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { install } from '@logtape/adaptor-pino'
import { getLogger } from '@logtape/logtape'
import pino from 'pino'

/** Root logger for the whole wallet extension. */
export const logger = getLogger('wallet-ext')

/** Pino logger for the core libraries, which take a pino `Logger`. */
export const pinoLogger = pino({
    name: 'main',
    // Unit tests would otherwise print every log record.
    level: import.meta.env.MODE === 'test' ? 'silent' : 'debug',
})

// Route LogTape records (`logger` and the core libraries) to pino.
install(pinoLogger)
