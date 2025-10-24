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
    platform: 'neutral', // or 'node' if node-only
    target: 'es2020',
    outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),

    // Bundle the codegen and its transitive problematic deps
    noExternal: [
        '@daml.js/token-standard-models-1.0.0',
        '@daml.js/ghc-stdlib-DA-Internal-Template-1.0.0',
        '@daml.js/daml-stdlib-DA-Time-Types-1.0.0',
        '@daml/types',
        '@daml/ledger',
        'lodash', // <- new
    ],

    // Nothing here should stay external anymore (remove @daml/* from external)
    external: [
        // keep ONLY what you truly want external at runtime (likely nothing here)
    ],
})
