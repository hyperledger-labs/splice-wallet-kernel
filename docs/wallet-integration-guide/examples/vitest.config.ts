// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
        include: ['**/*.test.ts'],
        setupFiles: ['./snippets/setupTests.ts'],
        testTimeout: 120_000,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
        },
        deps: {
            inline: ['jose'],
        },
    },
})
