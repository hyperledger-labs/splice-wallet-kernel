// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'eslint/config'
import config from '@canton-network/core-eslint-config'
import reactConfig from '@canton-network/core-eslint-config/react'

export default defineConfig([
    {
        ignores: ['.output/**', '.wxt/**'],
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
    },
])
