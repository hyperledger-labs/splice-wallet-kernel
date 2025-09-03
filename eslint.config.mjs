import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import { includeIgnoreFile } from '@eslint/compat'
import { fileURLToPath } from 'node:url'
import licenseHeader from 'eslint-plugin-license-header'

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url))

export default defineConfig([
    includeIgnoreFile(gitignorePath),
    globalIgnores([
        '**/dist',
        '**/build',
        '**/_proto',
        '**/.venv',
        '.yarn/',
        '.commitlintrc.js',
        '.pnp.*',
        'core/wallet-dapp-rpc-client',
        'core/wallet-user-rpc-client',
        'core/ledger-client/src/generated-clients',
        'core/token-standard/src/*',
        'docs/wallet-integration-guide/examples/**',
        'example/playwright-report/**',
    ]),
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
        languageOptions: { globals: { ...globals.browser, ...globals.node } },
        extends: ['js/recommended'],
        plugins: { js, 'license-header': licenseHeader },
        rules: {
            'license-header/header': [
                'error',
                [
                    '// Copyright (c) ' +
                        new Date().getFullYear() +
                        ' Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.',
                    '// SPDX-License-Identifier: Apache-2.0',
                ],
            ],
        },
    },
    tseslint.configs.recommended,
])
