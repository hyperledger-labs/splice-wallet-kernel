// Generated from Splice/Api/Token/AllocationV1.daml
/* eslint-disable @typescript-eslint/camelcase */

import * as jtv from '@mojotech/json-type-validation'
import * as damlTypes from '@daml/types'
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import * as damlLedger from '@daml/ledger'

import * as pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69 from '@daml.js/ghc-stdlib-DA-Internal-Template-1.0.0'

import * as Splice_Api_Token_HoldingV1 from '../../../../Splice/Api/Token/HoldingV1/module'
import * as Splice_Api_Token_MetadataV1 from '../../../../Splice/Api/Token/MetadataV1/module'

export declare type Allocation =
    damlTypes.Interface<'2e5bc93346f9c9e0bd2f4d64f966c0fac2089d101f3091ce26623bd417fd4075:Splice.Api.Token.AllocationV1:Allocation'> &
        AllocationView
export declare interface AllocationInterface {
    Archive: damlTypes.Choice<
        Allocation,
        pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive,
        {},
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<Allocation, undefined>
        >
    Allocation_Withdraw: damlTypes.Choice<
        Allocation,
        Allocation_Withdraw,
        Allocation_WithdrawResult,
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<Allocation, undefined>
        >
    Allocation_Cancel: damlTypes.Choice<
        Allocation,
        Allocation_Cancel,
        Allocation_CancelResult,
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<Allocation, undefined>
        >
    Allocation_ExecuteTransfer: damlTypes.Choice<
        Allocation,
        Allocation_ExecuteTransfer,
        Allocation_ExecuteTransferResult,
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<Allocation, undefined>
        >
}
export declare const Allocation: damlTypes.InterfaceCompanion<
    Allocation,
    undefined,
    '2e5bc93346f9c9e0bd2f4d64f966c0fac2089d101f3091ce26623bd417fd4075:Splice.Api.Token.AllocationV1:Allocation'
> &
    damlTypes.FromTemplate<Allocation, unknown> &
    AllocationInterface

export declare type Allocation_WithdrawResult = {
    senderHoldingCids: damlTypes.ContractId<Splice_Api_Token_HoldingV1.Holding>[]
    meta: Splice_Api_Token_MetadataV1.Metadata
}

export declare const Allocation_WithdrawResult: damlTypes.Serializable<Allocation_WithdrawResult> & {}

export declare type Allocation_CancelResult = {
    senderHoldingCids: damlTypes.ContractId<Splice_Api_Token_HoldingV1.Holding>[]
    meta: Splice_Api_Token_MetadataV1.Metadata
}

export declare const Allocation_CancelResult: damlTypes.Serializable<Allocation_CancelResult> & {}

export declare type Allocation_ExecuteTransferResult = {
    senderHoldingCids: damlTypes.ContractId<Splice_Api_Token_HoldingV1.Holding>[]
    receiverHoldingCids: damlTypes.ContractId<Splice_Api_Token_HoldingV1.Holding>[]
    meta: Splice_Api_Token_MetadataV1.Metadata
}

export declare const Allocation_ExecuteTransferResult: damlTypes.Serializable<Allocation_ExecuteTransferResult> & {}

export declare type Allocation_Withdraw = {
    extraArgs: Splice_Api_Token_MetadataV1.ExtraArgs
}

export declare const Allocation_Withdraw: damlTypes.Serializable<Allocation_Withdraw> & {}

export declare type Allocation_Cancel = {
    extraArgs: Splice_Api_Token_MetadataV1.ExtraArgs
}

export declare const Allocation_Cancel: damlTypes.Serializable<Allocation_Cancel> & {}

export declare type Allocation_ExecuteTransfer = {
    extraArgs: Splice_Api_Token_MetadataV1.ExtraArgs
}

export declare const Allocation_ExecuteTransfer: damlTypes.Serializable<Allocation_ExecuteTransfer> & {}

export declare type AllocationView = {
    allocation: AllocationSpecification
    holdingCids: damlTypes.ContractId<Splice_Api_Token_HoldingV1.Holding>[]
    meta: Splice_Api_Token_MetadataV1.Metadata
}

export declare const AllocationView: damlTypes.Serializable<AllocationView> & {}

export declare type AllocationSpecification = {
    settlement: SettlementInfo
    transferLegId: string
    transferLeg: TransferLeg
}

export declare const AllocationSpecification: damlTypes.Serializable<AllocationSpecification> & {}

export declare type TransferLeg = {
    sender: damlTypes.Party
    receiver: damlTypes.Party
    amount: damlTypes.Numeric
    instrumentId: Splice_Api_Token_HoldingV1.InstrumentId
    meta: Splice_Api_Token_MetadataV1.Metadata
}

export declare const TransferLeg: damlTypes.Serializable<TransferLeg> & {}

export declare type SettlementInfo = {
    executor: damlTypes.Party
    settlementRef: Reference
    requestedAt: damlTypes.Time
    allocateBefore: damlTypes.Time
    settleBefore: damlTypes.Time
    meta: Splice_Api_Token_MetadataV1.Metadata
}

export declare const SettlementInfo: damlTypes.Serializable<SettlementInfo> & {}

export declare type Reference = {
    id: string
    cid: damlTypes.Optional<
        damlTypes.ContractId<Splice_Api_Token_MetadataV1.AnyContract>
    >
}

export declare const Reference: damlTypes.Serializable<Reference> & {}
