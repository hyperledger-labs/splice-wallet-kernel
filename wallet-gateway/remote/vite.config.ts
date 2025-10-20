// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vite'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    root: 'src/web/frontend',
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
                networks: resolve(
                    __dirname,
                    'src/web/frontend/networks/index.html'
                ),
                wallets: resolve(
                    __dirname,
                    'src/web/frontend/wallets/index.html'
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
