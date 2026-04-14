// Generated from Splice/Api/Token/HoldingV1.daml
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-use-before-define */
import * as jtv from '@mojotech/json-type-validation'
import * as damlTypes from '@daml/types'

import * as pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f from '@daml.js/splice-api-token-metadata-v1-1.0.0'
import * as pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69 from '@daml.js/ghc-stdlib-DA-Internal-Template-1.0.0'
import * as pkgb70db8369e1c461d5c70f1c86f526a29e9776c655e6ffc2560f95b05ccb8b946 from '@daml.js/daml-stdlib-DA-Time-Types-1.0.0'

export declare type Holding =
    damlTypes.Interface<'#splice-api-token-holding-v1:Splice.Api.Token.HoldingV1:Holding'> &
        HoldingView
export declare interface HoldingInterface {
    Archive: damlTypes.Choice<
        Holding,
        pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive,
        {},
        undefined
    > &
        damlTypes.ChoiceFrom<damlTypes.InterfaceCompanion<Holding, undefined>>
}
export declare const Holding: damlTypes.InterfaceCompanion<
    Holding,
    undefined,
    '#splice-api-token-holding-v1:Splice.Api.Token.HoldingV1:Holding'
> &
    damlTypes.FromTemplate<Holding, unknown> &
    HoldingInterface

export declare type HoldingView = {
    owner: damlTypes.Party
    instrumentId: InstrumentId
    amount: damlTypes.Numeric
    lock: damlTypes.Optional<Lock>
    meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.Metadata
}

export declare const HoldingView: damlTypes.Serializable<HoldingView> & {}

export declare type Lock = {
    holders: damlTypes.Party[]
    expiresAt: damlTypes.Optional<damlTypes.Time>
    expiresAfter: damlTypes.Optional<pkgb70db8369e1c461d5c70f1c86f526a29e9776c655e6ffc2560f95b05ccb8b946.DA.Time.Types.RelTime>
    context: damlTypes.Optional<string>
}

export declare const Lock: damlTypes.Serializable<Lock> & {}

export declare type InstrumentId = {
    admin: damlTypes.Party
    id: string
}

export declare const InstrumentId: damlTypes.Serializable<InstrumentId> & {}
