// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any */
import { components } from '../generated-clients/openapi-3.3.0-SNAPSHOT'

export type ViewValue = components['schemas']['JsInterfaceView']['viewValue'] // unknown | undefined
export type JsActiveContract = components['schemas']['JsActiveContract']

export interface Transaction {
    updateId: string
    offset: number
    recordTime: string
    synchronizerId: string
    events: TokenStandardEvent[]
}

export interface TokenStandardEvent {
    label: Label
    lockedHoldingsChange: HoldingsChange
    lockedHoldingsChangeSummary: HoldingsChangeSummary
    unlockedHoldingsChange: HoldingsChange
    unlockedHoldingsChangeSummary: HoldingsChangeSummary
    transferInstruction: TransferInstructionView | null
}

// Same definition as HoldingView in Daml
export interface Holding {
    contractId: string
    owner: string
    instrumentId: { admin: string; id: string }
    amount: string
    lock: HoldingLock | null
    meta: any
}

export interface HoldingLock {
    holders: string[]
    expiresAt?: string
    expiresAfter?: string
    context?: string
}

export interface HoldingsChange {
    creates: Holding[]
    archives: Holding[]
}

export interface HoldingsChangeSummary {
    numInputs: number
    inputAmount: string
    numOutputs: number
    outputAmount: string
    amountChange: string
}
export const EmptyHoldingsChangeSummary: HoldingsChangeSummary = {
    numInputs: 0,
    inputAmount: '0',
    numOutputs: 0,
    outputAmount: '0',
    amountChange: '0',
}

/**
 * Same as TransferInstructionView in Daml when exercising a TransferInstruction choice,
 * otherwise just meta and transfer.
 */
// TODO investigate because it actually differs from TransferInstructionView from daml codegen
// where status is: { tag, value }
export interface TransferInstructionView {
    // currentInstructionCid: string // TODO (#505): add
    originalInstructionCid: string | null
    transfer: any
    status: {
        before: any
        // current: any; // TODO (#505): add
    }
    meta: any
}

export type Label =
    | TransferOut
    | TransferIn
    | MergeSplit
    | Burn
    | Mint
    | Unlock
    | Lock
    | ExpireDust
    | UnknownAction
type UnknownAction = RawArchive | RawCreate
interface BaseLabel {
    type: string
    meta: any
}
interface KnownLabel extends BaseLabel {
    mintAmount: string
    burnAmount: string
    reason: string | null
    tokenStandardChoice: TokenStandardChoice | null
}
export interface TokenStandardChoice {
    name: string
    choiceArgument: any
    exerciseResult: any
}

export interface TransferOut extends KnownLabel {
    type: 'TransferOut'
    receiverAmounts: Array<{ receiver: string; amount: string }>
}

export interface TransferIn extends KnownLabel {
    type: 'TransferIn'
    sender: string
}

export interface MergeSplit extends KnownLabel {
    type: 'MergeSplit'
}

// Same as MergeSplit, but is more precise (tx-kind=burn)
export interface Burn extends KnownLabel {
    type: 'Burn'
}

// Same as MergeSplit, but is more precise (tx-kind=mint)
export interface Mint extends KnownLabel {
    type: 'Mint'
}

export interface Unlock extends KnownLabel {
    type: 'Unlock'
}

export interface Lock extends KnownLabel {
    type: 'Lock'
}

export interface ExpireDust extends KnownLabel {
    type: 'ExpireDust'
}

export interface RawArchive extends BaseLabel {
    type: 'Archive'
    parentChoice: string
    contractId: string
    offset: number
    templateId: string
    packageName: string
    actingParties: string[]
    payload: any
    meta: any
}
export interface RawCreate extends BaseLabel {
    type: 'Create' | 'Lock'
    parentChoice: string
    contractId: string
    offset: number
    templateId: string
    payload: any
    packageName: string
    meta: any
}

export const renderTransaction = (t: Transaction): any => {
    return { ...t, events: t.events.map(renderTransactionEvent) }
}

const renderTransactionEvent = (e: TokenStandardEvent): any => {
    const lockedHoldingsChangeSummary = renderHoldingsChangeSummary(
        e.lockedHoldingsChangeSummary
    )
    const unlockedHoldingsChangeSummary = renderHoldingsChangeSummary(
        e.unlockedHoldingsChangeSummary
    )
    const lockedHoldingsChange = renderHoldingsChange(e.lockedHoldingsChange)
    const unlockedHoldingsChange = renderHoldingsChange(
        e.unlockedHoldingsChange
    )
    return {
        ...e,
        lockedHoldingsChange: lockedHoldingsChange
            ? { ...lockedHoldingsChange }
            : undefined,
        unlockedHoldingsChange: unlockedHoldingsChange
            ? { ...unlockedHoldingsChange }
            : undefined,
        lockedHoldingsChangeSummary: lockedHoldingsChangeSummary
            ? { ...lockedHoldingsChangeSummary }
            : undefined,
        unlockedHoldingsChangeSummary: unlockedHoldingsChangeSummary
            ? { ...unlockedHoldingsChangeSummary }
            : undefined,
    }
}

const renderHoldingsChangeSummary = (
    s: HoldingsChangeSummary
): Partial<HoldingsChangeSummary> | undefined => {
    if (
        s.numInputs === 0 &&
        s.numOutputs === 0 &&
        s.inputAmount === '0' &&
        s.outputAmount === '0' &&
        s.amountChange === '0'
    ) {
        return undefined
    }
    return {
        ...(s.numInputs !== 0 && { numInputs: s.numInputs }),
        ...(s.inputAmount !== '0' && { inputAmount: s.inputAmount }),
        ...(s.numOutputs !== 0 && { numOutputs: s.numOutputs }),
        ...(s.outputAmount !== '0' && { outputAmount: s.outputAmount }),
        ...(s.amountChange !== '0' && { amountChange: s.amountChange }),
    }
}

const renderHoldingsChange = (
    c: HoldingsChange
): Partial<HoldingsChange> | undefined => {
    if (c.creates.length === 0 && c.archives.length === 0) {
        return undefined
    }
    return {
        ...(c.creates.length !== 0 && { creates: c.creates }),
        ...(c.archives.length !== 0 && { archives: c.archives }),
    }
}

export interface PrettyTransactions {
    transactions: Transaction[]
    nextOffset: number
}

export interface PrettyContract<T = ViewValue> {
    contractId: string
    interfaceViewValue: T
    activeContract: JsActiveContract
}
