// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * LocalNet-only helpers shared by examples, docs scripts and E2E tests.
 *
 * This module is intentionally dependency-free (no Playwright, no node builtins)
 * so it can also be imported from browser/bundler example code. It is exposed as
 * the `@canton-network/core-wallet-test-utils/localnet` subpath export.
 *
 * NOTE: this package is private on purpose - none of this is production code and
 * it must never be pulled into the published SDK.
 */

import type { SynchronizerSelector } from '@canton-network/wallet-sdk'

/** Maps the two synchronizer roles used in multi-synchronizer setups. */
export type KnownSynchronizers = {
    globalSynchronizerId: string
    appSynchronizerId: string
}

/**
 * Builds a `synchronizerId` selector for `SDK.create` that picks the first
 * synchronizer matching one of `aliases`.
 *
 * The SDK refuses to guess when the participant is connected to several
 * synchronizers, so pass an explicit selector when your code targets one of them.
 */
export const synchronizerByAlias =
    (...aliases: string[]): SynchronizerSelector =>
    (synchronizers) => {
        const match = synchronizers.find((s) =>
            aliases.includes(s.synchronizerAlias)
        )
        if (!match) {
            throw new Error(
                `No synchronizer with alias ${aliases.join('/')} among: ${synchronizers
                    .map((s) => s.synchronizerAlias)
                    .join(', ')}`
            )
        }
        return match.synchronizerId
    }

/**
 * `synchronizerId` selector for `SDK.create` that picks LocalNet's global
 * synchronizer. LocalNet can additionally run an app-synchronizer, and the SDK
 * refuses to guess between them - pass this when your code targets the global one.
 */
export const localNetGlobalSynchronizer: SynchronizerSelector =
    synchronizerByAlias('global', 'global-domain')
