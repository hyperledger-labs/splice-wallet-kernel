// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { vi } from 'vitest'
import { createLogRecorder } from '@logtape/testing/recorder'

import { configure } from '@logtape/logtape'
import type { Logger } from 'pino'

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
