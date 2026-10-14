// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { PartyId } from '@canton-network/core-types'
import type {
    AllocationSpecification,
    OffLedger,
} from '@canton-network/core-token-standard'
import type { AssetBody } from '@canton-network/core-token-standard-service'

export type AllocationInstructionCreateParams = {
    allocationSpecification: AllocationSpecification
    asset: AssetBody
    inputUtxos?: string[]
    requestedAt?: string
    prefetchedRegistryChoiceContext?: {
        factoryId: string
        choiceContext: OffLedger.AllocationInstructionV1.components['schemas']['ChoiceContext']
    }
}

export type AllocationParams = {
    allocationCid: string
    asset: AssetBody
    prefetchedRegistryChoiceContext?: OffLedger.AllocationInstructionV1.components['schemas']['ChoiceContext']
}

export type AllocationContextParams = {
    allocationCid: string
    registryUrl: URL | string
}

export type AllocationScanParams = {
    /** Party whose visible allocations are polled. */
    partyId: PartyId
    /** Transfer leg ids to wait for; each one must become visible. */
    transferLegIds: string[]
    /** Maximum number of polling attempts before giving up. Default 30. */
    maxAttempts?: number
    /** Delay between polling attempts in milliseconds. Default 1000. */
    retryIntervalMs?: number
}
