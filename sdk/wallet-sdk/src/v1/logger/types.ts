// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import CustomLogAdapter from './adapter/custom'

export type LogContext = Partial<{
    namespace: string
    timestamp: string
    response: unknown
    arguments: unknown
    traceId: string
    partyId: PartyId
    [data: string]: unknown
}>

const LOG_LEVELS_TUPLE = [
    'debug',
    'error',
    'info',
    'warn',
    'trace',
] as const satisfies readonly (keyof Console)[]

export type LogLevel = (typeof LOG_LEVELS_TUPLE)[number]
export const logLevels = new Set(LOG_LEVELS_TUPLE)

export type LoggerMethods = {
    [K in LogLevel]: (ctx: LogContext, message?: string) => void
}

export interface LogAdapter {
    log(type: LogLevel, ctx: LogContext, message?: string): void
}

export type DefaultLogAdapters = 'console' | 'pino'
export type AllowedLogAdapters = DefaultLogAdapters | CustomLogAdapter
