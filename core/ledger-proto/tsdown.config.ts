// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig, type Rolldown } from 'tsdown'

const rewriteRelativeJsToCjs: Rolldown.Plugin = {
    name: 'rewrite-relative-js-to-cjs',
    renderChunk(code) {
        return code
            .replace(
                /from\s+(['"])(\.{1,2}\/[^'"]+?)\.js\1/g,
                'from $1$2.cjs$1'
            )
            .replace(
                /import\(\s*(['"])(\.{1,2}\/[^'"]+?)\.js\1\s*\)/g,
                'import($1$2.cjs$1)'
            )
            .replace(
                /require\(\s*(['"])(\.{1,2}\/[^'"]+?)\.js\1\s*\)/g,
                'require($1$2.cjs$1)'
            )
    },
}

const entry = [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/__tests__/**',
]

export default defineConfig([
    {
        entry,
        unbundle: true,
        format: ['esm'],
        sourcemap: true,
        target: 'es2020',
        outDir: 'dist/esm',
        outExtensions: () => ({ js: '.js' }),
        platform: 'neutral',
        treeshake: false,
        clean: true,
        dts: false,
    },
    {
        entry,
        unbundle: true,
        format: ['cjs'],
        sourcemap: false,
        target: 'es2020',
        outDir: 'dist/cjs',
        outExtensions: () => ({ js: '.cjs' }),
        platform: 'node',
        treeshake: false,
        clean: false,
        dts: false,
        plugins: [rewriteRelativeJsToCjs],
    },
])
