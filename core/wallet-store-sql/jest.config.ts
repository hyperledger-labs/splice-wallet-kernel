// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Config } from 'jest'

const config: Config = {
    rootDir: 'src',
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.ts'],
    transform: {
        '^.+\\.(t|j)sx?$': [
            '@swc/jest',
            {
                jsc: { parser: { syntax: 'typescript' }, target: 'es2020' },
                module: { type: 'es6' },
            },
        ],
    },
    resolver: null,
    moduleNameMapper: {
        '^(@canton-network/core-wallet-auth)$':
            '<rootDir>/../../wallet-auth/dist/index.js',
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    // transformIgnorePatterns: ['/node_modules/'],
} satisfies Config

export default config
