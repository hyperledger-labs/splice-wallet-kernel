// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { SynchronizerSelector } from '@canton-network/wallet-sdk'
import { localNetGlobalSynchronizer } from '@canton-network/core-wallet-test-utils/localnet'

/**
 * `synchronizerId` selector for `SDK.create`. The SDK refuses to guess when the
 * participant is connected to several synchronizers (LocalNet also runs an
 * app-synchronizer), and this dApp always trades on the global one.
 *
 * The implementation is shared with the docs scripts and the E2E tests; it lives
 * in the private `core-wallet-test-utils` package so this LocalNet-only helper
 * never ends up in the published SDK.
 */
export const globalSynchronizer: SynchronizerSelector =
    localNetGlobalSynchronizer
