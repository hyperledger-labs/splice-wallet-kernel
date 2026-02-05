// Generated from Splice/Api/FeaturedAppRightV1.daml
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-use-before-define */
import * as jtv from '@mojotech/json-type-validation'
import * as damlTypes from '@daml/types'

import * as pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69 from '@daml.js/ghc-stdlib-DA-Internal-Template-1.0.0'

export declare type FeaturedAppActivityMarker =
    damlTypes.Interface<'#splice-api-featured-app-v1:Splice.Api.FeaturedAppRightV1:FeaturedAppActivityMarker'> &
        FeaturedAppActivityMarkerView
export declare interface FeaturedAppActivityMarkerInterface {
    Archive: damlTypes.Choice<
        FeaturedAppActivityMarker,
        pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive,
        {},
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<FeaturedAppActivityMarker, undefined>
        >
}
export declare const FeaturedAppActivityMarker: damlTypes.InterfaceCompanion<
    FeaturedAppActivityMarker,
    undefined,
    '#splice-api-featured-app-v1:Splice.Api.FeaturedAppRightV1:FeaturedAppActivityMarker'
> &
    damlTypes.FromTemplate<FeaturedAppActivityMarker, unknown> &
    FeaturedAppActivityMarkerInterface

export declare type FeaturedAppRight =
    damlTypes.Interface<'#splice-api-featured-app-v1:Splice.Api.FeaturedAppRightV1:FeaturedAppRight'> &
        FeaturedAppRightView
export declare interface FeaturedAppRightInterface {
    Archive: damlTypes.Choice<
        FeaturedAppRight,
        pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive,
        {},
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<FeaturedAppRight, undefined>
        >
    FeaturedAppRight_CreateActivityMarker: damlTypes.Choice<
        FeaturedAppRight,
        FeaturedAppRight_CreateActivityMarker,
        FeaturedAppRight_CreateActivityMarkerResult,
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<FeaturedAppRight, undefined>
        >
}
export declare const FeaturedAppRight: damlTypes.InterfaceCompanion<
    FeaturedAppRight,
    undefined,
    '#splice-api-featured-app-v1:Splice.Api.FeaturedAppRightV1:FeaturedAppRight'
> &
    damlTypes.FromTemplate<FeaturedAppRight, unknown> &
    FeaturedAppRightInterface

export declare type FeaturedAppActivityMarkerView = {
    dso: damlTypes.Party
    provider: damlTypes.Party
    beneficiary: damlTypes.Party
    weight: damlTypes.Numeric
}

export declare const FeaturedAppActivityMarkerView: damlTypes.Serializable<FeaturedAppActivityMarkerView> & {}

export declare type FeaturedAppRightView = {
    dso: damlTypes.Party
    provider: damlTypes.Party
}

export declare const FeaturedAppRightView: damlTypes.Serializable<FeaturedAppRightView> & {}

export declare type FeaturedAppRight_CreateActivityMarkerResult = {
    activityMarkerCids: damlTypes.ContractId<FeaturedAppActivityMarker>[]
}

export declare const FeaturedAppRight_CreateActivityMarkerResult: damlTypes.Serializable<FeaturedAppRight_CreateActivityMarkerResult> & {}

export declare type FeaturedAppRight_CreateActivityMarker = {
    beneficiaries: AppRewardBeneficiary[]
}

export declare const FeaturedAppRight_CreateActivityMarker: damlTypes.Serializable<FeaturedAppRight_CreateActivityMarker> & {}

export declare type AppRewardBeneficiary = {
    beneficiary: damlTypes.Party
    weight: damlTypes.Numeric
}

export declare const AppRewardBeneficiary: damlTypes.Serializable<AppRewardBeneficiary> & {}
