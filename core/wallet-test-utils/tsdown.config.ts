// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsdown'
import { base } from '../../tsdown.base.ts'

export default defineConfig({
    ...base,
    // `src/localnet.ts` is a separate entry on purpose: it must stay importable
    // from browser/bundler example code, i.e. free of Playwright and node builtins.
    entry: ['src/index.ts', 'src/localnet.ts'],
    platform: 'node',
})
