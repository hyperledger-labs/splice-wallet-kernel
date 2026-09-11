// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { SynchronizerSelector } from '@canton-network/wallet-sdk'

/**
 * `synchronizerId` selector for `SDK.create`. The SDK refuses to guess when the
 * participant is connected to several synchronizers (LocalNet also runs an
 * app-synchronizer), and this dApp always trades on the global one.
 */
export const globalSynchronizer: SynchronizerSelector = (synchronizers) => {
    const global = synchronizers.find(
        (s) =>
            s.synchronizerAlias === 'global' ||
            s.synchronizerAlias === 'global-domain'
    )
    if (!global) {
        throw new Error(
            `No global synchronizer among: ${synchronizers
                .map((s) => s.synchronizerAlias)
                .join(', ')}`
        )
    }
    return global.synchronizerId
}
