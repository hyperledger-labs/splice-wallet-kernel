// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { PreparedCommand } from '../../../transactions/types.js'
import type { WrappedCommand } from '@canton-network/core-ledger-client-types'
import type { AssetBody } from '@canton-network/core-token-standard-service'
import type {
    AllocationSpecification,
    OffLedger,
    SettlementInfo,
    AllocationRequestView,
    SettlementFactory_SettleBatch,
} from '@canton-network/core-token-standard-v2'
import type { PrettyContract } from '@canton-network/core-tx-parser'
import type { PartyId } from '@canton-network/core-types'

export type AllocationChoiceContextV2 =
    OffLedger.AllocationInstructionV2.components['schemas']['ChoiceContext']

export type PreparedCommands = [
    WrappedCommand<'ExerciseCommand'>[],
    PreparedCommand[1],
]

export type AllocationInstructionCreateParams = {
    settlement: SettlementInfo
    allocationSpecification: AllocationSpecification
    asset: AssetBody
    actors?: PartyId[]
    inputUtxos?: string[]
    requestedAt?: string
    prefetchedRegistryChoiceContext?: {
        factoryId: string
        choiceContext: AllocationChoiceContextV2
    }
}

export type AllocationChoiceParams = {
    allocationCid: string
    asset: AssetBody
    actors: PartyId[]
    prefetchedRegistryChoiceContext: AllocationChoiceContextV2
}

export type AllocationContextParams = {
    allocationCid: string
    registryUrl: string | URL
}

/**
 * @param requireBothSides: Require every leg to be allocated on both its sender and receiver side
 * Only meaningful for. aparty taht sees all allocations (e.g. an executor)
 * Set to false when polling as a trader. Default true.
 */
export type AllocationScanParams = {
    partyId: PartyId
    settlement: Pick<SettlementInfo, 'id' | 'cid'>
    transferLegIds: string[]
    requireBothSides?: boolean
    maxAttempts?: number
    retryIntervalMs?: number
}

export type AllocationRequestActionParams = {
    request: PrettyContract<AllocationRequestView>
    partyId: PartyId
    actors?: PartyId[]
}

export type SettlementFactoryParams = {
    args: SettlementFactory_SettleBatch
    registryUrl: string | URL
}

export function actorsFor(
    availableActions: unknown,
    action: string,
    party: PartyId
): PartyId[] | undefined {
    const entries = availableActions as [{ tag: string }, PartyId[][]][]
    const groups = entries.find(([key]) => key.tag === action)?.[1]
    return groups?.find((group) => group.includes(party))
}

export const sameSettlement = (
    a: Pick<SettlementInfo, 'id' | 'cid'>,
    b: Pick<SettlementInfo, 'id' | 'cid'>
) => a.id === b.id && (a.cid ?? null) === (b.cid ?? null)
