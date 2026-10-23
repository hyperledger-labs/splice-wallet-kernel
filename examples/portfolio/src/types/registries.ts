// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { PartyId } from '@canton-network/core-types'

export type RegistryReachabilityStatus =
    | 'checking'
    | 'reachable'
    | 'unreachable'

export type RegistryEntry = {
    partyId?: PartyId
    registryUrl: string
    status: RegistryReachabilityStatus
    isRemovable: boolean
}

export type RegistryValidationStatus =
    | 'valid'
    | 'no-registries'
    | 'all-unreachable'
    | 'checking'
