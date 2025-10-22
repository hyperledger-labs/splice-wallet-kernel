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
    target: 'es2020',
    platform: 'neutral', // TODO check to make sure it's good with window object
    dts: false, // TODO I probably should have applied it in all tsups
    outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
})
