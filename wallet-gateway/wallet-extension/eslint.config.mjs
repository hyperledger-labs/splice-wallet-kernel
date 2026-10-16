// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'eslint/config'
import config from '@canton-network/core-eslint-config'
import reactConfig from '@canton-network/core-eslint-config/react'

export default defineConfig([
    {
        ignores: ['.output/**', '.wxt/**', 'src/ui/routeTree.gen.ts'],
    },
    {
        files: ['**/*.{ts,tsx}'],
        extends: [config, reactConfig],
        languageOptions: {
            parserOptions: {
                // This tells ESLint to automatically find the nearest tsconfig.json
                // for each linted file
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            'no-console': 'error',
            '@typescript-eslint/no-floating-promises': 'error',
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true, extraHOCs: ['createLink'] },
            ],
        },
    },
    {
        // Route files export `Route` next to their components. The router
        // plugin splits components into their own modules for HMR.
        files: ['src/ui/routes/**/*.{ts,tsx}'],
        rules: {
            'react-refresh/only-export-components': 'off',
        },
    },
])
