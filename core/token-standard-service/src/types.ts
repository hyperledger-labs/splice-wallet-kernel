// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { LedgerCommonSchemas } from '@canton-network/core-ledger-client-types'
import type { Ops } from '@canton-network/core-provider-ledger'
import type {
    TokenStandardClient,
    Metadata,
    Transfer,
    ExtraArgs,
} from '@canton-network/core-token-standard'
import type { PartyId } from '@canton-network/core-types'
import type { TokenStandardClient as TokenStandardClientV2 } from '@canton-network/core-token-standard-v2'

export const REQUESTED_AT_SKEW_MS = 60_000

export type ExerciseCommand = LedgerCommonSchemas['ExerciseCommand']
export type DisclosedContract = LedgerCommonSchemas['DisclosedContract']
export type GenericTokenStandardClient =
    TokenStandardClient | TokenStandardClientV2
export const EMPTY_META: Metadata = { values: {} }

export type JsGetActiveContractsResponse =
    LedgerCommonSchemas['JsGetActiveContractsResponse']
export type JsGetUpdatesResponse =
    Ops.PostV2Updates['ledgerApi']['result'][number]
export type JsGetUpdateResponse = LedgerCommonSchemas['JsGetUpdateResponse']
export type OffsetCheckpoint2 = LedgerCommonSchemas['OffsetCheckpoint2']
export type JsTransaction = LedgerCommonSchemas['JsTransaction']
export type UpdateFormat = LedgerCommonSchemas['UpdateFormat']

export type JsActiveContract = LedgerCommonSchemas['JsActiveContract']

export type OffsetCheckpointUpdate = {
    update: { OffsetCheckpoint: OffsetCheckpoint2 }
}
export type TransactionUpdate = {
    update: { Transaction: { value: JsTransaction } }
}

export type JsActiveContractEntryResponse = JsGetActiveContractsResponse & {
    contractEntry: {
        JsActiveContract: {
            createdEvent: LedgerCommonSchemas['CreatedEvent']
        }
    }
}

export type CreateTransferChoiceArgs = {
    expectedAdmin: PartyId
    transfer: Transfer
    extraArgs: ExtraArgs
}

export type ApiVersion = 'v1' | 'v2'
export type SupportedVersions = ApiVersion[]
export const SUPPORTED_VERSIONS: readonly ApiVersion[] = ['v1', 'v2'] as const

export interface AssetCapabilities {
    holding: SupportedVersions
    transferInstruction: SupportedVersions
    allocation: SupportedVersions
    allocationInstruction: SupportedVersions
    allocationRequest: SupportedVersions
}

export const KEY_MAPPING: Record<string, keyof AssetCapabilities> = {
    holding: 'holding',
    'transfer-instruction': 'transferInstruction',
    allocation: 'allocation',
    'allocation-instruction': 'allocationInstruction',
    'allocation-request': 'allocationRequest',
}

export type AssetBody = {
    id: string
    displayName: string
    symbol: string
    registryUrl: URL
    admin: PartyId
    capabilities: AssetCapabilities
}
