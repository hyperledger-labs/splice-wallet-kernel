// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vitest/config'
import { coverage, nodeProject } from '../../vitest.base.ts'

export default defineConfig({
    test: {
        coverage: coverage({
            exclude: [
                'src/migrations/**',
                'src/migrations-test/**',
                'src/cli.ts',
                'src/bootstrap.ts',
                'src/index.ts',
                'src/migrator.ts',
            ],
        }),
        projects: [
            nodeProject({ exclude: ['src/migrations-test/**'] }),
            // only run via the `test:migrations` target
            nodeProject({
                name: 'migrations',
                include: ['src/migrations-test/**/*.test.ts'],
                globalSetup: ['src/migrations-test/global-setup.ts'],
                testTimeout: 120_000,
                hookTimeout: 120_000,
            }),
        ],
    },
})
