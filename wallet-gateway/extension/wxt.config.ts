// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { resolve } from 'path'
import { defineConfig } from 'wxt'
import { standardDecorators } from '../../vite.decorators.js'

// See https://wxt.dev/api/config.html
export default defineConfig({
    modules: [],
    vite: () => ({
        plugins: [standardDecorators(resolve(import.meta.dirname, '**/*.ts'))],
    }),
    manifest: {
        name: 'Canton Wallet',
        description: 'Canton Wallet Extension',
        permissions: [
            'identity',
            'storage',
            'tabs',
            'webRequest',
            'webRequestBlocking',
        ],
        host_permissions: ['http://127.0.0.1/*'],
    },
})
