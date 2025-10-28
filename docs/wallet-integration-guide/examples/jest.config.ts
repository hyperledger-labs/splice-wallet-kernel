// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Config } from 'jest'

export default {
    rootDir: '.',
    injectGlobals: false,
    transformIgnorePatterns: ['/node_modules/(?!jose/)'],
    transform: {
        '^.+\\.(t|j)sx?$': '@swc/jest',
    },
} satisfies Config
