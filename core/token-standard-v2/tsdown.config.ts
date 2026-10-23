// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { resolve } from 'node:path'
import { esmExternalRequirePlugin } from 'rolldown/plugins'
import { defineConfig } from 'tsdown'
import { base } from '../../tsdown.base.ts'

export default defineConfig({
    ...base,
    entry: ['src/index.ts'],
    tsconfig: 'tsconfig.lib.json',
    alias: {
        '@daml.js': resolve(
            import.meta.dirname,
            '../../damljs/token-standard-models-v2'
        ),
    },
    // The generated packages only have `main`, which the neutral platform ignores
    inputOptions: { resolve: { mainFields: ['main'] } },
    plugins: [
        esmExternalRequirePlugin({
            external: ['@daml/types', '@mojotech/json-type-validation'],
        }),
    ],
    dts: true,
})
