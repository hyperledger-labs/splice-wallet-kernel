// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import typescript from '@rollup/plugin-typescript'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default {
    input: 'src/index.ts',
    output: {
        dir: 'dist',
        format: 'es',
    },
    external: [
        '@canton-network/core-types',
        '@daml/ledger',
        '@daml/types',
        'lodash',
        'openapi-fetch',
        'uuid',
        'zod',
    ],
    plugins: [
        commonjs({
            transformMixedEsModules: true,
        }),
        typescript(),
        nodeResolve(),
    ],
}
