// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { vi } from 'vitest'
import {
    createLogRecorder,
    type LogRecorder,
    type LogRecordMatch,
} from '@logtape/testing/recorder'

import { configure } from '@logtape/logtape'

interface Logger {
    isLevelEnabled(level: string): boolean
    trace(...args: unknown[]): void
    debug(...args: unknown[]): void
    info(...args: unknown[]): void
    warn(...args: unknown[]): void
    error(...args: unknown[]): void
    child(): Logger
}

export function createTestLogger(): Logger {
    const logger = {
        isLevelEnabled: vi.fn().mockReturnValue(false),
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        child: vi.fn(),
    }
    logger.child.mockReturnValue(logger)
    return logger as unknown as Logger
}

export async function initializeLogRecorder() {
    const recorder = createLogRecorder()

    await configure({
        sinks: { recorder: recorder.sink },
        loggers: [
            {
                category: ['core'],
                lowestLevel: 'trace',
                sinks: ['recorder'],
            },
            { category: ['logtape', 'meta'], sinks: [] },
        ],
    })

    return recorder
}

export async function assertLevel(
    recorder: LogRecorder,
    level: NonNullable<LogRecordMatch['level']>,
    message?: NonNullable<LogRecordMatch['message']>,
    invert: boolean = false
) {
    if (invert) {
        return recorder.assertNotLogged({
            level,
            ...(message !== undefined ? { message } : {}),
        })
    }
    return recorder.assertLogged({
        level,
        ...(message !== undefined ? { message } : {}),
    })
}
