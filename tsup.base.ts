// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Options } from 'tsup'
export const base: Options = {
    format: ['esm', 'cjs'],
    outDir: 'dist',
    sourcemap: true,
    clean: true,
    treeshake: true,
    target: 'es2020',
    platform: 'neutral',
    dts: false,
    outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
}
