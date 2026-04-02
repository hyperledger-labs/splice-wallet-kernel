// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
        include: ['**/*.test.ts'],
        setupFiles: ['./snippets/setupTests.ts'],
        testTimeout: 120_000,
        deps: {
            inline: ['jose'],
        },
    },
})
