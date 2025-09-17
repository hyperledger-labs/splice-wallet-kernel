// Generated from Splice/Api/Token/AllocationRequestV1.daml
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-use-before-define */
import * as jtv from '@mojotech/json-type-validation'
import * as damlTypes from '@daml/types'
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import * as damlLedger from '@daml/ledger'

import * as pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69 from '@daml.js/ghc-stdlib-DA-Internal-Template-1.0.0'

import * as Splice_Api_Token_AllocationV1 from '../../../../Splice/Api/Token/AllocationV1/module'
import * as Splice_Api_Token_MetadataV1 from '../../../../Splice/Api/Token/MetadataV1/module'

export declare type AllocationRequest =
    damlTypes.Interface<'a132be8b23c8515da6c828dd97519a73d9c8b1aa6f9cddd3c7acc206e4b41f8c:Splice.Api.Token.AllocationRequestV1:AllocationRequest'> &
        AllocationRequestView
export declare interface AllocationRequestInterface {
    Archive: damlTypes.Choice<
        AllocationRequest,
        pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive,
        {},
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<AllocationRequest, undefined>
        >
    AllocationRequest_Reject: damlTypes.Choice<
        AllocationRequest,
        AllocationRequest_Reject,
        Splice_Api_Token_MetadataV1.ChoiceExecutionMetadata,
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<AllocationRequest, undefined>
        >
    AllocationRequest_Withdraw: damlTypes.Choice<
        AllocationRequest,
        AllocationRequest_Withdraw,
        Splice_Api_Token_MetadataV1.ChoiceExecutionMetadata,
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<AllocationRequest, undefined>
        >
}
export declare const AllocationRequest: damlTypes.InterfaceCompanion<
    AllocationRequest,
    undefined,
    'a132be8b23c8515da6c828dd97519a73d9c8b1aa6f9cddd3c7acc206e4b41f8c:Splice.Api.Token.AllocationRequestV1:AllocationRequest'
> &
    damlTypes.FromTemplate<AllocationRequest, unknown> &
    AllocationRequestInterface

export declare type AllocationRequestView = {
    settlement: Splice_Api_Token_AllocationV1.SettlementInfo
    transferLegs: { [key: string]: Splice_Api_Token_AllocationV1.TransferLeg }
    meta: Splice_Api_Token_MetadataV1.Metadata
}

export declare const AllocationRequestView: damlTypes.Serializable<AllocationRequestView> & {}

export declare type AllocationRequest_Withdraw = {
    extraArgs: Splice_Api_Token_MetadataV1.ExtraArgs
}

export declare const AllocationRequest_Withdraw: damlTypes.Serializable<AllocationRequest_Withdraw> & {}

export declare type AllocationRequest_Reject = {
    actor: damlTypes.Party
    extraArgs: Splice_Api_Token_MetadataV1.ExtraArgs
}

export declare const AllocationRequest_Reject: damlTypes.Serializable<AllocationRequest_Reject> & {}
