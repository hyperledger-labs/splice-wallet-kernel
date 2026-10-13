// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vitest/config'
import { browserProject, coverage } from '../../vitest.base.ts'

export default defineConfig({
    test: {
        coverage: coverage({
            exclude: [
                'src/**/*.stories.ts',
                'src/vite-env.d.ts',
                'src/components/fixtures.ts',
            ],
        }),
        projects: [browserProject()],
    },
})
