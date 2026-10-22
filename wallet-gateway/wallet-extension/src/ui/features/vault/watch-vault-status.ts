// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { QueryClient } from '@tanstack/react-query'
import type { AnyRouter } from '@tanstack/react-router'
import { vaultStatusItem } from '@/shared/storage'

/**
 * Keeps a page in step with the vault when another page or the background
 * changes its status. Returns the unwatch function.
 *
 * Call it before the router's first load. The root route only renders once
 * that load has finished, so a watcher mounted in a route would miss a change
 * made while the guards were waiting for the background.
 */
export function watchVaultStatus(router: AnyRouter, queryClient: QueryClient) {
    return vaultStatusItem.watch((status) => {
        if (status !== 'unlocked') {
            // Drop everything read while the vault was unlocked.
            queryClient.clear()
        }
        // Re-run the route guards: a locked page moves to /unlock, and
        // /unlock moves on when another page unlocks.
        void router.invalidate()
    })
}
