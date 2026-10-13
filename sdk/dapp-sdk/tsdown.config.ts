// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs'
import { defineConfig } from 'tsdown'
import { base } from '../../tsdown.base.ts'

const sdkVersion = JSON.parse(
    readFileSync(new URL('./package.json', import.meta.url), 'utf8')
).version as string

export default defineConfig({
    ...base,
    entry: ['src/index.ts'],
    define: {
        __DAPP_SDK_VERSION__: JSON.stringify(sdkVersion),
    },
})
