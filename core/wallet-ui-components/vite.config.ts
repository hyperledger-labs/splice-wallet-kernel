// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { standardDecorators } from '../../vite.decorators.js'

export default defineConfig({
    build: {
        emptyOutDir: false,
        lib: {
            entry: {
                index: 'src/index.ts',
                'react/index': 'src/react/index.ts',
            },
            formats: ['es', 'cjs'],
            fileName: (format, entryName) =>
                `${entryName}.${format === 'cjs' ? 'cjs' : 'js'}`,
            cssFileName: 'index',
        },
        rolldownOptions: {
            external: [
                /^lit($|\/)/,
                'bootstrap',
                '@popperjs/core',
                'react',
                'react-dom',
                /^react\//,
                /^react-dom\//,
                /^@mui\//,
            ],
            output: {
                exports: 'auto',
            },
        },
        sourcemap: true,
    },
    plugins: [
        standardDecorators(resolve(import.meta.dirname, 'src/**/*.ts')),
        dts({ tsconfigPath: './tsconfig.lib.json' }),
    ],
})
