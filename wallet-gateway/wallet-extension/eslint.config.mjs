// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'eslint/config'
import config from '@canton-network/core-eslint-config'
import reactConfig from '@canton-network/core-eslint-config/react'

// Import boundaries. A later config object replaces a rule's options instead
// of merging them, so every block passes the shared restrictions plus its own.

/** Matches `@/<area>`, `~/<area>` and relative `../<area>` imports. */
const areaImport = (area) => `^(?:[@~]/|(?:\\.\\./)+)${area}(?:/|$)`

const sharedRestrictions = {
    paths: [
        {
            name: '@canton-network/core-wallet-ui-components',
            message:
                'The root entry loads Lit and global Bootstrap CSS. Import from @canton-network/core-wallet-ui-components/react.',
        },
    ],
    patterns: [
        {
            // https://mui.com/material-ui/guides/minimizing-bundle-size/
            regex: '^@mui/[^/]+$',
            message:
                "Use path imports, e.g. import Button from '@mui/material/Button'.",
        },
    ],
}

function restrictImports(...areas) {
    return {
        '@typescript-eslint/no-restricted-imports': [
            'error',
            {
                paths: sharedRestrictions.paths,
                patterns: [
                    ...sharedRestrictions.patterns,
                    ...areas.map(({ area, allowTypeImports, message }) => ({
                        regex: areaImport(area),
                        caseSensitive: true,
                        allowTypeImports,
                        message,
                    })),
                ],
            },
        ],
    }
}

const noUi = {
    area: 'ui',
    allowTypeImports: false,
    message: 'Only extension pages may import ui/ (React, MUI).',
}
const typesFrom = (area, runtime) => ({
    area,
    allowTypeImports: true,
    message: `${area}/ runs in the ${runtime}. Import its types with \`import type\`, or move shared code to shared/.`,
})
const typesFromBackground = typesFrom('background', 'service worker')
const typesFromContent = typesFrom('content', 'content script')

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
            ...restrictImports(),
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
    {
        files: ['src/ui/**', 'src/entrypoints/{popup,app}/**'],
        rules: restrictImports(typesFromBackground, typesFromContent),
    },
    {
        files: ['src/background/**', 'src/entrypoints/background.ts'],
        rules: restrictImports(noUi, typesFromContent),
    },
    {
        files: [
            'src/content/**',
            'src/entrypoints/content.ts',
            'src/entrypoints/*.content.ts',
        ],
        rules: restrictImports(noUi, typesFromBackground),
    },
    {
        files: ['src/shared/**'],
        rules: restrictImports(noUi, typesFromBackground, typesFromContent),
    },
])
