// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import { browserProject, coverage } from '../../vitest.base.ts'

const sdkVersion = JSON.parse(
    readFileSync(new URL('./package.json', import.meta.url), 'utf8')
).version as string

export default defineConfig({
    define: {
        __DAPP_SDK_VERSION__: JSON.stringify(sdkVersion),
    },
    test: {
        globalSetup: ['./vitest.global-setup.ts'],
        coverage: coverage({
            exclude: [
                'src/integration-test/**',
                'src/dapp-api/rpc-gen/**',
                'src/test-utils.ts',
            ],
        }),
        projects: [
            browserProject({
                exclude: ['src/integration-test/*.test.ts'],
            }),
            // run separately by `test:integration` so integration tests don't count towards coverage
            browserProject({
                name: 'browser-integration',
                include: ['src/integration-test/*.test.ts'],
            }),
        ],
    },
})
