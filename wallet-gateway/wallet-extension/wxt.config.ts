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
    manifestVersion: 3,
    manifest: ({ browser, mode }) => ({
        name: WALLET_NAME,
        description: 'Wallet Browser Extension',
        permissions: ['identity', 'storage'],
        // Networks and IDPs are user-configured, so their origins are unknown
        // at build time. The UI requests the specific ledger/IDP origins via
        // `browser.permissions.request()` when a network is added.
        optional_host_permissions: [
            'https://*/*',
            'http://localhost/*',
            'http://127.0.0.1/*',
        ],
        // Dev builds pre-grant the seeded local participant and mock OAuth
        // server so they work without a prompt.
        host_permissions: mode === 'development' ? ['http://127.0.0.1/*'] : [],
        // Firefox MV3 requires an extension ID. The ID and the data-collection
        // declaration are placeholders until release.
        ...(browser === 'firefox' && {
            browser_specific_settings: {
                gecko: {
                    id: 'wallet-extension@canton.network',
                    strict_min_version: '128.0',
                    data_collection_permissions: { required: ['none'] },
                },
            },
        }),
    }),
})
