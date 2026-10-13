// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vitest/config'
import { coverage, nodeProject } from '../../vitest.base.ts'

export default defineConfig({
    test: {
        coverage: coverage({
            // current levels, raise as coverage improves
            thresholds: { lines: 65, functions: 65, statements: 65 },
        }),
        projects: [nodeProject()],
    },
})
