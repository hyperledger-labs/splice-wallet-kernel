// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    outDir: 'dist',
    sourcemap: true,
    clean: true,
    treeshake: true,
    platform: 'node',
    target: 'node18',
    outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
})
