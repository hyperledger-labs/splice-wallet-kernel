// Generated from Splice/Api/Token/AllocationInstructionV1.daml
/* eslint-disable @typescript-eslint/camelcase */

import * as jtv from '@mojotech/json-type-validation'
import * as damlTypes from '@daml/types'
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import * as damlLedger from '@daml/ledger'

import * as pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69 from '@daml.js/ghc-stdlib-DA-Internal-Template-1.0.0'

import * as Splice_Api_Token_AllocationV1 from '../../../../Splice/Api/Token/AllocationV1/module'
import * as Splice_Api_Token_HoldingV1 from '../../../../Splice/Api/Token/HoldingV1/module'
import * as Splice_Api_Token_MetadataV1 from '../../../../Splice/Api/Token/MetadataV1/module'

export declare type AllocationFactory =
    damlTypes.Interface<'2e5bc93346f9c9e0bd2f4d64f966c0fac2089d101f3091ce26623bd417fd4075:Splice.Api.Token.AllocationInstructionV1:AllocationFactory'> &
        AllocationFactoryView
export declare interface AllocationFactoryInterface {
    Archive: damlTypes.Choice<
        AllocationFactory,
        pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive,
        {},
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<AllocationFactory, undefined>
        >
    AllocationFactory_Allocate: damlTypes.Choice<
        AllocationFactory,
        AllocationFactory_Allocate,
        AllocationInstructionResult,
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<AllocationFactory, undefined>
        >
    AllocationFactory_PublicFetch: damlTypes.Choice<
        AllocationFactory,
        AllocationFactory_PublicFetch,
        AllocationFactoryView,
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<AllocationFactory, undefined>
        >
}
export declare const AllocationFactory: damlTypes.InterfaceCompanion<
    AllocationFactory,
    undefined,
    '2e5bc93346f9c9e0bd2f4d64f966c0fac2089d101f3091ce26623bd417fd4075:Splice.Api.Token.AllocationInstructionV1:AllocationFactory'
> &
    damlTypes.FromTemplate<AllocationFactory, unknown> &
    AllocationFactoryInterface

export declare type AllocationInstruction =
    damlTypes.Interface<'2e5bc93346f9c9e0bd2f4d64f966c0fac2089d101f3091ce26623bd417fd4075:Splice.Api.Token.AllocationInstructionV1:AllocationInstruction'> &
        AllocationInstructionView
export declare interface AllocationInstructionInterface {
    Archive: damlTypes.Choice<
        AllocationInstruction,
        pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive,
        {},
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<AllocationInstruction, undefined>
        >
    AllocationInstruction_Withdraw: damlTypes.Choice<
        AllocationInstruction,
        AllocationInstruction_Withdraw,
        AllocationInstructionResult,
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<AllocationInstruction, undefined>
        >
    AllocationInstruction_Update: damlTypes.Choice<
        AllocationInstruction,
        AllocationInstruction_Update,
        AllocationInstructionResult,
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<AllocationInstruction, undefined>
        >
}
export declare const AllocationInstruction: damlTypes.InterfaceCompanion<
    AllocationInstruction,
    undefined,
    '2e5bc93346f9c9e0bd2f4d64f966c0fac2089d101f3091ce26623bd417fd4075:Splice.Api.Token.AllocationInstructionV1:AllocationInstruction'
> &
    damlTypes.FromTemplate<AllocationInstruction, unknown> &
    AllocationInstructionInterface

export declare type AllocationInstructionResult_Output =
    | {
          tag: 'AllocationInstructionResult_Pending'
          value: AllocationInstructionResult_Output.AllocationInstructionResult_Pending
      }
    | {
          tag: 'AllocationInstructionResult_Completed'
          value: AllocationInstructionResult_Output.AllocationInstructionResult_Completed
      }
    | { tag: 'AllocationInstructionResult_Failed'; value: {} }

export declare const AllocationInstructionResult_Output: damlTypes.Serializable<AllocationInstructionResult_Output> & {
    AllocationInstructionResult_Pending: damlTypes.Serializable<AllocationInstructionResult_Output.AllocationInstructionResult_Pending>
    AllocationInstructionResult_Completed: damlTypes.Serializable<AllocationInstructionResult_Output.AllocationInstructionResult_Completed>
}

export namespace AllocationInstructionResult_Output {
    type AllocationInstructionResult_Pending = {
        allocationInstructionCid: damlTypes.ContractId<AllocationInstruction>
    }
} //namespace AllocationInstructionResult_Output

export namespace AllocationInstructionResult_Output {
    type AllocationInstructionResult_Completed = {
        allocationCid: damlTypes.ContractId<Splice_Api_Token_AllocationV1.Allocation>
    }
} //namespace AllocationInstructionResult_Output

export declare type AllocationInstructionResult = {
    output: AllocationInstructionResult_Output
    senderChangeCids: damlTypes.ContractId<Splice_Api_Token_HoldingV1.Holding>[]
    meta: Splice_Api_Token_MetadataV1.Metadata
}

export declare const AllocationInstructionResult: damlTypes.Serializable<AllocationInstructionResult> & {}

export declare type AllocationFactory_PublicFetch = {
    expectedAdmin: damlTypes.Party
    actor: damlTypes.Party
}

export declare const AllocationFactory_PublicFetch: damlTypes.Serializable<AllocationFactory_PublicFetch> & {}

export declare type AllocationFactory_Allocate = {
    expectedAdmin: damlTypes.Party
    allocation: Splice_Api_Token_AllocationV1.AllocationSpecification
    requestedAt: damlTypes.Time
    inputHoldingCids: damlTypes.ContractId<Splice_Api_Token_HoldingV1.Holding>[]
    extraArgs: Splice_Api_Token_MetadataV1.ExtraArgs
}

export declare const AllocationFactory_Allocate: damlTypes.Serializable<AllocationFactory_Allocate> & {}

export declare type AllocationFactoryView = {
    admin: damlTypes.Party
    meta: Splice_Api_Token_MetadataV1.Metadata
}

export declare const AllocationFactoryView: damlTypes.Serializable<AllocationFactoryView> & {}

export declare type AllocationInstruction_Update = {
    extraActors: damlTypes.Party[]
    extraArgs: Splice_Api_Token_MetadataV1.ExtraArgs
}

export declare const AllocationInstruction_Update: damlTypes.Serializable<AllocationInstruction_Update> & {}

export declare type AllocationInstruction_Withdraw = {
    extraArgs: Splice_Api_Token_MetadataV1.ExtraArgs
}

export declare const AllocationInstruction_Withdraw: damlTypes.Serializable<AllocationInstruction_Withdraw> & {}

export declare type AllocationInstructionView = {
    originalInstructionCid: damlTypes.Optional<
        damlTypes.ContractId<AllocationInstruction>
    >
    allocation: Splice_Api_Token_AllocationV1.AllocationSpecification
    pendingActions: damlTypes.Map<damlTypes.Party, string>
    requestedAt: damlTypes.Time
    inputHoldingCids: damlTypes.ContractId<Splice_Api_Token_HoldingV1.Holding>[]
    meta: Splice_Api_Token_MetadataV1.Metadata
}

export declare const AllocationInstructionView: damlTypes.Serializable<AllocationInstructionView> & {}
