// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig } from 'eslint/config'
import { includeIgnoreFile } from '@eslint/compat'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import headers from 'eslint-plugin-headers'
import nxeslint from '@nx/eslint-plugin'

const repoRoot = dirname(fileURLToPath(import.meta.url))
const gitignorePath = join(repoRoot, '.gitignore')
const headerFilePath = join(repoRoot, 'header.txt')

export default defineConfig([
    includeIgnoreFile(gitignorePath),
    {
        ignores: [
            '**/dist',
            '**/build',
            '**/_proto',
            '**/.venv',
            '**/vite-env.d.ts',
            '.yarn/**',
            '.commitlintrc.js',
            '.pnp.*',
            'core/wallet-dapp-rpc-client',
            'core/wallet-dapp-remote-rpc-client',
            'core/wallet-user-rpc-client',
            'core/ledger-client/src/generated-clients',
            'core/ledger-client-types/src/generated-clients',
            'damljs/**',
            'docs/wallet-integration-guide/examples/**',
            'examples/ping/playwright-report/**',
        ],
    },
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
                    path: headerFilePath,
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
    {
        files: ['**/*.{ts,tsx,mts,cts}'],
        plugins: { '@nx': nxeslint },
    },
])
