// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vite'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    root: 'src/web/frontend',
    // Relative base for regular build, absolute for dev
    // Vite doesn't support relative base in dev mode
    // dev mode does both build and later serve, hence relying on env var instead of command
    base: process.env.NODE_ENV === 'development' ? '/' : './',
    build: {
        outDir: resolve(__dirname, './dist/web/frontend'),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'src/web/frontend/index.html'),
                404: resolve(__dirname, 'src/web/frontend/404/index.html'),
                approve: resolve(
                    __dirname,
                    'src/web/frontend/approve/index.html'
                ),
                callback: resolve(
                    __dirname,
                    'src/web/frontend/callback/index.html'
                ),
                login: resolve(__dirname, 'src/web/frontend/login/index.html'),
                parties: resolve(
                    __dirname,
                    'src/web/frontend/parties/index.html'
                ),
                addParty: resolve(
                    __dirname,
                    'src/web/frontend/parties/add/index.html'
                ),
                settings: resolve(
                    __dirname,
                    'src/web/frontend/settings/index.html'
                ),
                activities: resolve(
                    __dirname,
                    'src/web/frontend/activities/index.html'
                ),
                transactions: resolve(
                    __dirname,
                    'src/web/frontend/transactions/index.html'
                ),
                networks: resolve(
                    __dirname,
                    'src/web/frontend/networks/index.html'
                ),
                addNetwork: resolve(
                    __dirname,
                    'src/web/frontend/networks/add/index.html'
                ),
                reviewNetwork: resolve(
                    __dirname,
                    'src/web/frontend/networks/review/index.html'
                ),
                identityProviders: resolve(
                    __dirname,
                    'src/web/frontend/identity-providers/index.html'
                ),
                addIdentityProvider: resolve(
                    __dirname,
                    'src/web/frontend/identity-providers/add/index.html'
                ),
                reviewIdentityProvider: resolve(
                    __dirname,
                    'src/web/frontend/identity-providers/review/index.html'
                ),
            },
        },
    },
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
