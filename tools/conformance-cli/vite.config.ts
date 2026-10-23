// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { isAbsolute } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
    build: {
        target: 'node24',
        sourcemap: true,
        lib: {
            entry: { index: 'src/index.ts', cli: 'src/cli.ts' },
            formats: ['es'],
        },
        rolldownOptions: {
            external: (id) => !id.startsWith('.') && !isAbsolute(id),
        },
    },
})
