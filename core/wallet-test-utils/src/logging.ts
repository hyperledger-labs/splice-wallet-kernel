// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createLogRecorder } from '@logtape/testing/recorder'

import { configure } from '@logtape/logtape'

export async function initializeLogRecorder() {
    const recorder = createLogRecorder()

    await configure({
        sinks: { recorder: recorder.sink },
        loggers: [
            {
                category: ['core'],
                lowestLevel: 'debug',
                sinks: ['recorder'],
            },
            { category: ['logtape', 'meta'], sinks: [] },
        ],
    })

    return recorder
}
