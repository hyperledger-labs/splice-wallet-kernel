// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsup'
import { base } from '../../tsup.base'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    ...base,
    entry: [resolve(rootDir, 'src/main.ts')],
    outDir: resolve(rootDir, 'dist'),
    external: ['k6', 'k6/http', 'k6/metrics', 'k6/options'],
    dts: false,
})
