// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vitest/config'
import { browserProject, coverage, nodeProject } from '../../vitest.base.ts'

export default defineConfig({
    test: {
        coverage: coverage({
            exclude: [
                'src/**/*.test.ts',
                'src/**/*.d.ts',
                'src/web/frontend/dist/**',
                'src/web/frontend/**/test-helpers.ts',
                'src/**/rpc-gen/**',
            ],
            thresholds: {
                lines: 75,
                functions: 75,
                statements: 75,
                branches: 65,
            },
        }),
        projects: [
            nodeProject({
                exclude: ['src/web/frontend/**/*.test.ts'],
                setupFiles: ['./vitest.setup.ts'],
            }),
            browserProject({
                include: ['src/web/frontend/**/*.test.ts'],
                setupFiles: ['./vitest.setup.browser.ts'],
            }),
        ],
    },
})
