// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Config } from 'jest'

const config: Config = {
    // Use 'projects' to run different configurations in one command
    projects: [
        {
            displayName: 'sdk-v0',
            rootDir: '.',
            injectGlobals: true,
            setupFilesAfterEnv: ['./snippets/setupTests.ts'],
            transformIgnorePatterns: ['/node_modules/(?!jose/)'],
            transform: {
                '^.+\\.(t|j)sx?$': '@swc/jest',
            },
        },
        {
            displayName: 'sdk-v1',
            rootDir: '.',
            injectGlobals: true,
            setupFilesAfterEnv: ['./snippets/v1/setupTests.ts'],
            transformIgnorePatterns: ['/node_modules/(?!jose/)'],
            transform: {
                '^.+\\.(t|j)sx?$': '@swc/jest',
            },
        },
    ],
}

export default config
