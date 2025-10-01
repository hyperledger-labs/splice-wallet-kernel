// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export * from './token-standard-client.js'

// Codegen outputs are treated as separate package
// this gets around issues with relative paths imports in dist
// That arisen because of daml codegen outputting only .js and .d.ts files

// Constants
export * from './interface-ids.const.js'

type InstrumentId = {
    admin: string
    id: string
}

type Metadata = {
    values: { [key: string]: string }
}

export type HoldingView = {
    owner: string
    instrumentId: InstrumentId
    amount: string
    lock: Record<string, string | number>
    meta: Metadata
}

export type AllocationRequestView = {
    settlement: SettlementInfo
    transferLegs: { [key: string]: TransferLeg }
    meta: Metadata
}

export type TransferLeg = {
    sender: string
    receiver: string
    amount: string
    instrumentId: InstrumentId
    meta: Metadata
}

export interface Reference {
    id: string
    cid?: string
}

export interface SettlementInfo {
    executor: string
    settlementRef: Reference
    requestedAt: string
    allocateBefore: string
    settleBefore: string
    meta: Metadata
}

export interface AllocationSpecification {
    settlement: SettlementInfo
    transferLegId: string
    transferLeg: TransferLeg
}

export type AllocationContextValue =
    | { tag: 'AV_Text'; value: string }
    | { tag: 'AV_Bool'; value: boolean }
    | { tag: 'AV_string'; value: string }
    | { tag: 'AV_Party'; value: string }
    | { tag: 'AV_Time'; value: string }
    | { tag: 'AV_Int64'; value: string }
    | { tag: 'AV_Decimal'; value: string }

export interface ExtraArgs {
    context: { values: Record<string, unknown> }
    meta: Metadata
}

export interface AllocationFactory_Allocate {
    expectedAdmin: string

    allocation: AllocationSpecification

    /** Submission/request time (ledger time bound checks use this alongside settlement.requestedAt) */
    requestedAt: string

    /** Inputs to spend for the sender; array of Holding contractIds */
    inputHoldingCids: string[]

    /** Extra args, including registry-provided choiceContext */
    extraArgs: ExtraArgs
}
