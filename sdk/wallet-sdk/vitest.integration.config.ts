// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vitest/config'

/**
 * The `*.integration.test.ts` files under `src/` talk to a real ledger -- a
 * splice LocalNet, started with `pnpm run start:localnet` from the repo root
 * -- rather than to mocks, so they run under their own config instead of
 * `vitest.config.ts`'s node/browser projects: no browser project (there is
 * nothing to run in one), and a longer timeout, since a purchase round-trips
 * the registry and the ledger several times over.
 */
export default defineConfig({
    test: {
        name: 'integration',
        environment: 'node',
        include: ['src/**/*.integration.test.ts'],
        testTimeout: 120_000,
        hookTimeout: 120_000,
    },
})
