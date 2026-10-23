// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vite'
import { resolve } from 'path'
import { standardDecorators } from '../../vite.decorators.js'
import { resolveRouteInputs } from './src/web/route-inputs.js'

const frontendRoot = resolve(import.meta.dirname, 'src/web/frontend')

export default defineConfig({
    root: 'src/web/frontend',
    // Relative base for regular build, absolute for dev
    // Vite doesn't support relative base in dev mode
    // dev mode does both build and later serve, hence relying on env var instead of command
    base: process.env.NODE_ENV === 'development' ? '/' : './',
    build: {
        outDir: resolve(import.meta.dirname, './dist/web/frontend'),
        emptyOutDir: true,
        rolldownOptions: {
            input: resolveRouteInputs(frontendRoot),
        },
    },
    plugins: [standardDecorators(resolve(frontendRoot, '**/*.ts'))],
    resolve: {
        alias: {
            '@canton-network/core-wallet-ui-components': resolve(
                import.meta.dirname,
                '../../core/wallet-ui-components'
            ),
            '@canton-network/core-wallet-user-rpc-client': resolve(
                import.meta.dirname,
                '../../core/wallet-user-rpc-client'
            ),
        },
    },
})
