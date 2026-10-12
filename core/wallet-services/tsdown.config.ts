// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsdown'
import { base } from '../../tsdown.base.ts'

export default defineConfig({
    ...base,
    entry: {
        index: 'src/index.ts',
        // Published `./utils` subpath, kept for backwards compatibility. The
        // root entry is runtime-agnostic, so new code should import from it.
        utils: 'src/utils.ts',
    },
})
