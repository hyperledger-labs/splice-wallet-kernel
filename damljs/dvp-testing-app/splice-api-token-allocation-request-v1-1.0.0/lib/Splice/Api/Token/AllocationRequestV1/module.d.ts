// Generated from Splice/Api/Token/AllocationRequestV1.daml
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-use-before-define */
import * as jtv from '@mojotech/json-type-validation'
import * as damlTypes from '@daml/types'

import * as pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f from '@daml.js/splice-api-token-metadata-v1-1.0.0'
import * as pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d from '@daml.js/splice-api-token-allocation-v1-1.0.0'
import * as pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69 from '@daml.js/ghc-stdlib-DA-Internal-Template-1.0.0'

export declare type AllocationRequest =
    damlTypes.Interface<'#splice-api-token-allocation-request-v1:Splice.Api.Token.AllocationRequestV1:AllocationRequest'> &
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
        pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.ChoiceExecutionMetadata,
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<AllocationRequest, undefined>
        >
    AllocationRequest_Withdraw: damlTypes.Choice<
        AllocationRequest,
        AllocationRequest_Withdraw,
        pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.ChoiceExecutionMetadata,
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<AllocationRequest, undefined>
        >
}
export declare const AllocationRequest: damlTypes.InterfaceCompanion<
    AllocationRequest,
    undefined,
    '#splice-api-token-allocation-request-v1:Splice.Api.Token.AllocationRequestV1:AllocationRequest'
> &
    damlTypes.FromTemplate<AllocationRequest, unknown> &
    AllocationRequestInterface

export declare type AllocationRequestView = {
    settlement: pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d.Splice.Api.Token.AllocationV1.SettlementInfo
    transferLegs: {
        [
            key: string
        ]: pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d.Splice.Api.Token.AllocationV1.TransferLeg
    }
    meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.Metadata
}

export declare const AllocationRequestView: damlTypes.Serializable<AllocationRequestView> & {}

export declare type AllocationRequest_Withdraw = {
    extraArgs: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.ExtraArgs
}

export declare const AllocationRequest_Withdraw: damlTypes.Serializable<AllocationRequest_Withdraw> & {}

export declare type AllocationRequest_Reject = {
    actor: damlTypes.Party
    extraArgs: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.ExtraArgs
}

export declare const AllocationRequest_Reject: damlTypes.Serializable<AllocationRequest_Reject> & {}
