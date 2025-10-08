// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vite'

export default defineConfig({
    build: {
        lib: {
            formats: ['es'],
            entry: 'src/index.ts',
            fileName: 'index',
            cssFileName: 'index',
        },
    },
})
