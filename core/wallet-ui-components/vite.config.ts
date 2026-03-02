// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
    build: {
        emptyOutDir: false,
        lib: {
            entry: 'src/index.ts',
            formats: ['es', 'cjs'],
            fileName: (format) => (format === 'cjs' ? 'index.cjs' : 'index.js'),
            cssFileName: 'index',
        },
        rollupOptions: {
            external: ['lit', 'bootstrap', '@popperjs/core'],
            output: {
                exports: 'auto',
            },
        },
        sourcemap: true,
    },
    plugins: [dts()],
})
