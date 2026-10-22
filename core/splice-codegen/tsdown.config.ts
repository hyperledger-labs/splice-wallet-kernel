// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { esmExternalRequirePlugin } from 'rolldown/plugins'
import { defineConfig } from 'tsdown'
import { base } from '../../tsdown.base.ts'

const damljs = resolve(import.meta.dirname, '../../damljs')

// The generated packages of a codegen output directory, which are named
// after their directories
const damlJsPackages = (dir: string) =>
    Object.fromEntries(
        readdirSync(resolve(damljs, dir)).map((name) => [
            `@daml.js/${name}`,
            resolve(damljs, dir, name),
        ])
    )

export default defineConfig({
    ...base,
    entry: ['src/index.ts'],
    platform: 'node',
    shims: true,
    tsconfig: 'tsconfig.lib.json',
    alias: {
        ...damlJsPackages('splice-test-token-v1'),
        ...damlJsPackages('splice-token-test-trading-app'),
        ...damlJsPackages('splice-test-token-v2'),
    },
    plugins: [
        esmExternalRequirePlugin({
            external: ['@daml/types', '@mojotech/json-type-validation'],
        }),
    ],
    dts: true,
})
