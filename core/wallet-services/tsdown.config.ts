// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsdown'
import { base } from '../../tsdown.base.ts'

export default defineConfig({
    ...base,
    entry: {
        index: 'src/index.ts',
        // Separate entry so consumers that only need these browser-safe
        // helpers (e.g. the WXT extension) aren't forced to bundle
        // transaction-service.ts and its Node-only signing dependencies.
        utils: 'src/utils.ts',
        // Runtime-agnostic notification core, importable without the
        // Node-only dependencies of the rest of the package (e.g. by the
        // browser extension).
        'notification/index': 'src/notification/index.ts',
    },
})
