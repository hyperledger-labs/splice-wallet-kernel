// Generated from Splice/Api/Token/AllocationV1.daml
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-use-before-define */
import * as jtv from '@mojotech/json-type-validation'
import * as damlTypes from '@daml/types'

import * as pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f from '@daml.js/splice-api-token-metadata-v1-1.0.0'
import * as pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b from '@daml.js/splice-api-token-holding-v1-1.0.0'
import * as pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69 from '@daml.js/ghc-stdlib-DA-Internal-Template-1.0.0'

export declare type Allocation =
    damlTypes.Interface<'#splice-api-token-allocation-v1:Splice.Api.Token.AllocationV1:Allocation'> &
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
    '#splice-api-token-allocation-v1:Splice.Api.Token.AllocationV1:Allocation'
> &
    damlTypes.FromTemplate<Allocation, unknown> &
    AllocationInterface

export declare type Allocation_WithdrawResult = {
    senderHoldingCids: damlTypes.ContractId<pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b.Splice.Api.Token.HoldingV1.Holding>[]
    meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.Metadata
}

export declare const Allocation_WithdrawResult: damlTypes.Serializable<Allocation_WithdrawResult> & {}

export declare type Allocation_CancelResult = {
    senderHoldingCids: damlTypes.ContractId<pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b.Splice.Api.Token.HoldingV1.Holding>[]
    meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.Metadata
}

export declare const Allocation_CancelResult: damlTypes.Serializable<Allocation_CancelResult> & {}

export declare type Allocation_ExecuteTransferResult = {
    senderHoldingCids: damlTypes.ContractId<pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b.Splice.Api.Token.HoldingV1.Holding>[]
    receiverHoldingCids: damlTypes.ContractId<pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b.Splice.Api.Token.HoldingV1.Holding>[]
    meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.Metadata
}

export declare const Allocation_ExecuteTransferResult: damlTypes.Serializable<Allocation_ExecuteTransferResult> & {}

export declare type Allocation_Withdraw = {
    extraArgs: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.ExtraArgs
}

export declare const Allocation_Withdraw: damlTypes.Serializable<Allocation_Withdraw> & {}

export declare type Allocation_Cancel = {
    extraArgs: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.ExtraArgs
}

export declare const Allocation_Cancel: damlTypes.Serializable<Allocation_Cancel> & {}

export declare type Allocation_ExecuteTransfer = {
    extraArgs: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.ExtraArgs
}

export declare const Allocation_ExecuteTransfer: damlTypes.Serializable<Allocation_ExecuteTransfer> & {}

export declare type AllocationView = {
    allocation: AllocationSpecification
    holdingCids: damlTypes.ContractId<pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b.Splice.Api.Token.HoldingV1.Holding>[]
    meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.Metadata
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
    instrumentId: pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b.Splice.Api.Token.HoldingV1.InstrumentId
    meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.Metadata
}

export declare const TransferLeg: damlTypes.Serializable<TransferLeg> & {}

export declare type SettlementInfo = {
    executor: damlTypes.Party
    settlementRef: Reference
    requestedAt: damlTypes.Time
    allocateBefore: damlTypes.Time
    settleBefore: damlTypes.Time
    meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.Metadata
}

export declare const SettlementInfo: damlTypes.Serializable<SettlementInfo> & {}

export declare type Reference = {
    id: string
    cid: damlTypes.Optional<
        damlTypes.ContractId<pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.AnyContract>
    >
}

export declare const Reference: damlTypes.Serializable<Reference> & {}
