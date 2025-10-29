// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsup'
import fs from 'node:fs/promises'

const rewriteRelativeJsToCjs = {
    name: 'rewrite-relative-js-to-cjs',
    setup(build) {
        build.onLoad({ filter: /\.[mc]?[tj]sx?$/ }, async (args) => {
            const src = await fs.readFile(args.path, 'utf8')
            // only rewrite relative specifiers that end in .js
            const out = src
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

            const loader = args.path.endsWith('.ts') ? 'ts' : 'js'

            return { contents: out, loader }
        })
    },
}

const entry = [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/__tests__/**',
]

export default defineConfig([
    {
        entry,
        bundle: false,
        format: ['esm'],
        splitting: false,
        sourcemap: true,
        target: 'es2020',
        outDir: 'dist/esm',
        outExtension: () => ({ js: '.js' }),
        platform: 'neutral',
        treeshake: false,
        clean: true,
        dts: false,
    },
    {
        entry,
        bundle: false,
        format: ['cjs'],
        splitting: false,
        sourcemap: true,
        target: 'es2020',
        outDir: 'dist/cjs',
        outExtension: () => ({ js: '.cjs' }),
        platform: 'node',
        treeshake: false,
        clean: false,
        dts: false,
        esbuildPlugins: [rewriteRelativeJsToCjs],
    },
])
