// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { includeIgnoreFile } from '@eslint/config-helpers'
import headers from 'eslint-plugin-headers'
import nxeslint from '@nx/eslint-plugin'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '../..')

const gitignorePath = join(rootDir, '.gitignore')
const headerFilePath = join(rootDir, 'header.txt')

export default [
    includeIgnoreFile(gitignorePath),
    {
        ignores: [
            '**/dist',
            '**/build',
            '**/_proto',
            '**/.venv',
            '**/vite-env.d.ts',
            '.commitlintrc.js',
            'core/wallet-dapp-rpc-client',
            'core/wallet-dapp-remote-rpc-client',
            'core/wallet-user-rpc-client',
            'core/ledger-client/src/generated-clients',
            'core/ledger-client-types/src/generated-clients',
            'damljs/**',
            'docs/wallet-integration-guide/examples/**',
            'examples/ping/playwright-report/**',
            'examples/test-token-v1-registry/src/openapi-ts/**',
            'core/rpc-generator/templates/client/typescript/src/index.ts',
        ],
    },
    js.configs.recommended,
    {
        files: ['**/*.{js,mjs,cjs,ts,tsx,mts,cts}'],
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: rootDir,
            },
            globals: { ...globals.browser, ...globals.node },
        },
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
        files: ['**/*.{js,mjs,cjs,ts,tsx,mts,cts}'],
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: rootDir,
            },
        },
        plugins: { '@nx': nxeslint },
    },
    {
        // Required by verbatimModuleSyntax: type-only imports must be erased explicitly.
        files: ['**/*.{ts,tsx,mts,cts}'],
        rules: {
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    fixStyle: 'inline-type-imports',
                    disallowTypeAnnotations: false,
                },
            ],
            '@typescript-eslint/no-import-type-side-effects': 'error',
        },
    },
]
