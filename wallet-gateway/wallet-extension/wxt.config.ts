// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { defineConfig } from 'wxt'
import { WALLET_NAME } from './src/shared/brand'

// See https://wxt.dev/api/config.html
export default defineConfig({
    srcDir: 'src',
    imports: false,
    modules: ['@wxt-dev/module-react'],
    react: {
        // The router plugin must run before react(). WXT merges module Vite
        // config before the user `vite` config, so it goes here.
        vitePluginsBefore: [
            tanstackRouter({
                target: 'react',
                // Paths resolve against the Vite root, which WXT sets to the
                // project root.
                routesDirectory: './src/ui/routes',
                generatedRouteTree: './src/ui/routeTree.gen.ts',
                autoCodeSplitting: true,
            }),
        ],
    },
    manifest: {
        name: WALLET_NAME,
        description: 'Canton Wallet browser extension',
        permissions: ['identity', 'storage'],
        // The background calls the local participant and mock OAuth server.
        host_permissions: ['http://127.0.0.1/*'],
    },
})
