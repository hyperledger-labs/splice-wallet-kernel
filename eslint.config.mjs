// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import { includeIgnoreFile } from '@eslint/compat'
import { fileURLToPath } from 'node:url'
import headers from 'eslint-plugin-headers'

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url))

export default defineConfig([
    includeIgnoreFile(gitignorePath),
    globalIgnores([
        '**/dist',
        '**/build',
        '**/_proto',
        '**/.venv',
        '**/vite-env.d.ts',
        '.yarn/**',
        '.commitlintrc.js',
        '.pnp.*',
        'core/wallet-dapp-rpc-client',
        'core/wallet-user-rpc-client',
        'core/ledger-client/src/generated-clients',
        'core/token-standard/src/**',
        'docs/wallet-integration-guide/examples/**',
        'example/playwright-report/**',
    ]),
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
        languageOptions: { globals: { ...globals.browser, ...globals.node } },
        extends: ['js/recommended'],
        plugins: { js, headers },
        rules: {
            'headers/header-format': [
                'error',
                {
                    source: 'file',
                    path: 'header.txt',
                    style: 'line',
                    trailingNewlines: 2,
                    variables: {
                        year: `${new Date().getFullYear()}`,
                    },
                },
            ],
        },
    },
    tseslint.configs.recommended,
])
