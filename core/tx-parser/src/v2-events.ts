// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { LedgerCommonSchemas } from '@canton-network/core-ledger-client-types'
import {
    EVENT_LOG_INTERFACE_ID,
    type EventLog_HoldingsChange,
    type Account,
    type TransferLegSide,
    type HoldingView as HoldingViewV2,
    HOLDING_INTERFACE_ID_V2,
} from '@canton-network/core-token-standard-v2'
import { matchInterfaceIds, ReasonMetaKey } from './constants.js'
import type { Holding, Label, TokenStandardChoice } from './types.js'
import BigNumber from 'bignumber.js'
import { getMetaKeyValue } from './utils.js'

//ownerless accounts for mints and burns from CIP-112
export const MINT_ACCOUNT_ID = 'cip-112/mint'
export const BURN_ACCOUNT_ID = 'cip-112/burn'

type CreatedEvent = LedgerCommonSchemas['CreatedEvent']
type ExercisedEvent = LedgerCommonSchemas['ExercisedEvent']

//information attached to labels derived from EventLog_HoldingsChange
export interface V2LabelDetails {
    admin: string
    account: Account
    transferLegSides: TransferLegSide[]
    parentChoice: string
}

export function extractHoldingsChange(
    exercised: ExercisedEvent
): EventLog_HoldingsChange | null {
    if (
        exercised.choice !== 'EventLog_HoldingsChange' ||
        !exercised.interfaceId ||
        !matchInterfaceIds(EVENT_LOG_INTERFACE_ID, exercised.interfaceId)
    ) {
        return null
    }

    return exercised.choiceArgument as EventLog_HoldingsChange
}

export function getHoldingViewV2(
    createdEvent: CreatedEvent
): HoldingViewV2 | null {
    const view = createdEvent.interfaceViews?.find(
        (v) =>
            v.interfaceId &&
            matchInterfaceIds(HOLDING_INTERFACE_ID_V2, v.interfaceId)
    )

    return (view?.viewValue as HoldingViewV2 | undefined) ?? null
}

export function sameAccount(a: Account, b: Account): boolean {
    return (
        (a.owner ?? null) === (b.owner ?? null) &&
        (a.provider ?? null) === (b.provider ?? null) &&
        a.id === b.id
    )
}

export function netChangeCids(change: EventLog_HoldingsChange) {
    const inputs = change.inputHoldingCids as unknown as string[]
    const outputs = change.outputHoldingCids as unknown as string[]

    return {
        inputs: inputs.filter((cid) => !outputs.includes(cid)),
        outputs: outputs.filter((cid) => !inputs.includes(cid)),
    }
}
/**
 * Holding cids an EventLog_HoldingsChange refers to
 */
export function holdingCidsOf(change: EventLog_HoldingsChange): string[] {
    return [
        ...(change.inputHoldingCids as unknown as string[]),
        ...(change.outputHoldingCids as unknown as string[]),
    ]
}

export function toHolding(cid: string, view: HoldingViewV2): Holding {
    return {
        contractId: cid,
        owner: view.account.owner ?? '',
        account: view.account,
        instrumentId: view.instrumentId,
        amount: view.amount,
        lock: view.lock ?? null,
        meta: view.meta,
    } as Holding
}

const isSpecialAccount = (account: Account, id: string) =>
    account.owner == null && account.id === id

const sumAmounts = (legs: TransferLegSide[]) =>
    legs.reduce((sum, leg) => sum.plus(leg.amount), new BigNumber(0))

export function deriveV2Label(opts: {
    change: EventLog_HoldingsChange
    parentChoice: string
    tokenStandardChoice: TokenStandardChoice
    onlyUnlocks: boolean
}): Label {
    const { change, parentChoice, tokenStandardChoice, onlyUnlocks } = opts
    const meta = change.extraArgs.meta

    const legReasons = [
        ...new Set(
            change.transferLegSides
                .map((l) => getMetaKeyValue(ReasonMetaKey, l.meta))
                .filter((r): r is string => !!r)
        ),
    ]
    const reason =
        getMetaKeyValue(ReasonMetaKey, meta) ??
        (legReasons.length === 1 ? legReasons[0] : null)
    const v2: V2LabelDetails = {
        admin: change.admin,
        account: change.account,
        transferLegSides: change.transferLegSides,
        parentChoice,
    }

    const external = change.transferLegSides.filter(
        (l) => !sameAccount(l.otherside, change.account)
    )

    const sent = external.filter((l) => l.side === 'SenderSide')
    const received = external.filter((l) => l.side === 'ReceiverSide')
    const burned = sent.filter((l) =>
        isSpecialAccount(l.otherside, BURN_ACCOUNT_ID)
    )
    const minted = received.filter((l) =>
        isSpecialAccount(l.otherside, MINT_ACCOUNT_ID)
    )
    const transfersOut = sent.filter((l) => !burned.includes(l))
    const transfersIn = received.filter((l) => !minted.includes(l))

    const common = {
        burnAmount: sumAmounts(burned).toString(),
        mintAmount: sumAmounts(minted).toString(),
        tokenStandardChoice,
        reason,
        meta,
        v2,
    }

    const noTransferType = () =>
        burned.length > 0 && minted.length === 0
            ? 'Burn'
            : minted.length > 0 && burned.length === 0
              ? 'Mint'
              : change.transferLegSides.length === 0 && onlyUnlocks
                ? 'Unlock'
                : 'MergeSplit'

    if (transfersOut.length === 0 && transfersIn.length === 0) {
        return { ...common, type: noTransferType() } as Label
    }
    const net = new Map<
        string,
        { counterparty: string; instrumentId: string; amount: BigNumber }
    >()
    for (const l of [...transfersOut, ...transfersIn]) {
        const counterparty = l.otherside.owner ?? l.otherside.id
        const key = `${counterparty}-${l.instrumentId}`
        const entry = net.get(key) ?? {
            counterparty: counterparty,
            instrumentId: l.instrumentId,
            amount: new BigNumber(0),
        }
        entry.amount =
            l.side === 'SenderSide'
                ? entry.amount.plus(l.amount)
                : entry.amount.minus(l.amount)

        net.set(key, entry)
    }
    const outs = [...net.values()].filter((e) => e.amount.gt(0))
    const ins = [...net.values()].filter((e) => e.amount.lt(0))

    if (outs.length === 0 && ins.length === 0) {
        return { ...common, type: noTransferType() } as Label
    }

    if (outs.length > 0 && ins.length > 0) {
        return {
            ...common,
            type: 'Settlement',
            netTransfers: [...outs, ...ins].map((e) => ({
                counterparty: e.counterparty,
                instrumentId: { admin: change.admin, id: e.instrumentId },
                amount: e.amount.toString(),
            })),
        } as Label
    }

    if (outs.length > 0) {
        return {
            ...common,
            type: 'TransferOut',
            receiverAmounts: outs.map((e) => ({
                receiver: e.counterparty,
                amount: e.amount.toString(),
            })),
        } as Label
    }

    const senders = [
        ...new Set(transfersIn.map((l) => l.otherside.owner ?? l.otherside.id)),
    ]

    return {
        ...common,
        type: 'TransferIn',
        burnAmount: '0', //V1 convention has burnt/mint as always 0 for receiving side
        mintAmount: '0',
        sender: senders.length === 1 ? senders[0] : senders.join(','),
    } as Label
}
