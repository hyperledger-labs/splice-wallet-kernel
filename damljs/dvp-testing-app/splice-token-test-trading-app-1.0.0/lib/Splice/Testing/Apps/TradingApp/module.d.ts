// Generated from Splice/Testing/Apps/TradingApp.daml
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-use-before-define */
import * as jtv from '@mojotech/json-type-validation'
import * as damlTypes from '@daml/types'

import * as pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f from '@daml.js/splice-api-token-metadata-v1-1.0.0'
import * as pkg5aee9b21b8e9a4c4975b5f4c4198e6e6e8469df49e2010820e792f393db870f4 from '@daml.js/daml-prim-DA-Types-1.0.0'
import * as pkg6fe848530b2404017c4a12874c956ad7d5c8a419ee9b040f96b5c13172d2e193 from '@daml.js/splice-api-token-allocation-request-v1-1.0.0'
import * as pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d from '@daml.js/splice-api-token-allocation-v1-1.0.0'
import * as pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69 from '@daml.js/ghc-stdlib-DA-Internal-Template-1.0.0'

export declare type OTCTrade_Cancel = {
    allocationsWithContext: {
        [
            key: string
        ]: pkg5aee9b21b8e9a4c4975b5f4c4198e6e6e8469df49e2010820e792f393db870f4.DA.Types.Tuple2<
            damlTypes.ContractId<pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d.Splice.Api.Token.AllocationV1.Allocation>,
            pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.ExtraArgs
        >
    }
}

export declare const OTCTrade_Cancel: damlTypes.Serializable<OTCTrade_Cancel> & {}

export declare type OTCTrade_Settle = {
    allocationsWithContext: {
        [
            key: string
        ]: pkg5aee9b21b8e9a4c4975b5f4c4198e6e6e8469df49e2010820e792f393db870f4.DA.Types.Tuple2<
            damlTypes.ContractId<pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d.Splice.Api.Token.AllocationV1.Allocation>,
            pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.ExtraArgs
        >
    }
}

export declare const OTCTrade_Settle: damlTypes.Serializable<OTCTrade_Settle> & {}

export declare type OTCTrade = {
    venue: damlTypes.Party
    transferLegs: {
        [
            key: string
        ]: pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d.Splice.Api.Token.AllocationV1.TransferLeg
    }
    tradeCid: damlTypes.ContractId<OTCTradeProposal>
    createdAt: damlTypes.Time
    prepareUntil: damlTypes.Time
    settleBefore: damlTypes.Time
}

export declare interface OTCTradeInterface {
    Archive: damlTypes.Choice<
        OTCTrade,
        pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive,
        {},
        undefined
    > &
        damlTypes.ChoiceFrom<damlTypes.Template<OTCTrade, undefined>>
    OTCTrade_Cancel: damlTypes.Choice<
        OTCTrade,
        OTCTrade_Cancel,
        {
            [
                key: string
            ]: damlTypes.Optional<pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d.Splice.Api.Token.AllocationV1.Allocation_CancelResult>
        },
        undefined
    > &
        damlTypes.ChoiceFrom<damlTypes.Template<OTCTrade, undefined>>
    OTCTrade_Settle: damlTypes.Choice<
        OTCTrade,
        OTCTrade_Settle,
        {
            [
                key: string
            ]: pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d.Splice.Api.Token.AllocationV1.Allocation_ExecuteTransferResult
        },
        undefined
    > &
        damlTypes.ChoiceFrom<damlTypes.Template<OTCTrade, undefined>>
}
export declare const OTCTrade: damlTypes.Template<
    OTCTrade,
    undefined,
    '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTrade'
> &
    damlTypes.ToInterface<
        OTCTrade,
        pkg6fe848530b2404017c4a12874c956ad7d5c8a419ee9b040f96b5c13172d2e193.Splice.Api.Token.AllocationRequestV1.AllocationRequest
    > &
    OTCTradeInterface

export declare namespace OTCTrade {}

export declare type OTCTradeProposal_InitiateSettlement = {
    prepareUntil: damlTypes.Time
    settleBefore: damlTypes.Time
}

export declare const OTCTradeProposal_InitiateSettlement: damlTypes.Serializable<OTCTradeProposal_InitiateSettlement> & {}

export declare type OTCTradeProposal_Reject = {
    trader: damlTypes.Party
}

export declare const OTCTradeProposal_Reject: damlTypes.Serializable<OTCTradeProposal_Reject> & {}

export declare type OTCTradeProposal_Accept = {
    approver: damlTypes.Party
}

export declare const OTCTradeProposal_Accept: damlTypes.Serializable<OTCTradeProposal_Accept> & {}

export declare type OTCTradeProposal = {
    venue: damlTypes.Party
    tradeCid: damlTypes.Optional<damlTypes.ContractId<OTCTradeProposal>>
    transferLegs: {
        [
            key: string
        ]: pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d.Splice.Api.Token.AllocationV1.TransferLeg
    }
    approvers: damlTypes.Party[]
}

export declare interface OTCTradeProposalInterface {
    OTCTradeProposal_Accept: damlTypes.Choice<
        OTCTradeProposal,
        OTCTradeProposal_Accept,
        damlTypes.ContractId<OTCTradeProposal>,
        undefined
    > &
        damlTypes.ChoiceFrom<damlTypes.Template<OTCTradeProposal, undefined>>
    OTCTradeProposal_Reject: damlTypes.Choice<
        OTCTradeProposal,
        OTCTradeProposal_Reject,
        {},
        undefined
    > &
        damlTypes.ChoiceFrom<damlTypes.Template<OTCTradeProposal, undefined>>
    OTCTradeProposal_InitiateSettlement: damlTypes.Choice<
        OTCTradeProposal,
        OTCTradeProposal_InitiateSettlement,
        damlTypes.ContractId<OTCTrade>,
        undefined
    > &
        damlTypes.ChoiceFrom<damlTypes.Template<OTCTradeProposal, undefined>>
    Archive: damlTypes.Choice<
        OTCTradeProposal,
        pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive,
        {},
        undefined
    > &
        damlTypes.ChoiceFrom<damlTypes.Template<OTCTradeProposal, undefined>>
}
export declare const OTCTradeProposal: damlTypes.Template<
    OTCTradeProposal,
    undefined,
    '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal'
> &
    damlTypes.ToInterface<OTCTradeProposal, never> &
    OTCTradeProposalInterface

export declare namespace OTCTradeProposal {}
