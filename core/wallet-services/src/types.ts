// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type {
    SigningDriverInterface,
    SigningProvider,
} from '@canton-network/core-signing-lib'

/**
 * Signing drivers registered at Wallet Gateway startup.
 * Partial because only configured providers are present (e.g. Dfns when env vars are set).
 */
export type SigningDrivers = Partial<
    Record<SigningProvider, SigningDriverInterface>
>

export type HASHING_SCHEME_VERSION =
    'HASHING_SCHEME_VERSION_V2' | 'HASHING_SCHEME_VERSION_V3'
