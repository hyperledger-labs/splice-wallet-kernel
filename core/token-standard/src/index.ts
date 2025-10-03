// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export * from './token-standard-client.js'
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
    requestedAt: string
    inputHoldingCids: string[]
    extraArgs: ExtraArgs
}

export type AllocationInstructionView = {
    originalInstructionCid: string | null
    allocation: AllocationSpecification
    pendingActions: Record<string, string>
    requestedAt: string
    inputHoldingCids: string[]
    meta: Metadata
}

export type AllocationView = {
    allocation: AllocationSpecification
    holdingCids: string[]
    meta: Metadata
}
