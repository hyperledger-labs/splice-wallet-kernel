// Generated from Splice/Api/Token/MetadataV1.daml
/* eslint-disable @typescript-eslint/camelcase */

import * as jtv from '@mojotech/json-type-validation'
import * as damlTypes from '@daml/types'
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import * as damlLedger from '@daml/ledger'

import * as pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69 from '@daml.js/ghc-stdlib-DA-Internal-Template-1.0.0'
import * as pkgb70db8369e1c461d5c70f1c86f526a29e9776c655e6ffc2560f95b05ccb8b946 from '@daml.js/daml-stdlib-DA-Time-Types-1.0.0'

export declare type AnyContract =
    damlTypes.Interface<'2e5bc93346f9c9e0bd2f4d64f966c0fac2089d101f3091ce26623bd417fd4075:Splice.Api.Token.MetadataV1:AnyContract'> &
        AnyContractView
export declare interface AnyContractInterface {
    Archive: damlTypes.Choice<
        AnyContract,
        pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive,
        {},
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<AnyContract, undefined>
        >
}
export declare const AnyContract: damlTypes.InterfaceCompanion<
    AnyContract,
    undefined,
    '2e5bc93346f9c9e0bd2f4d64f966c0fac2089d101f3091ce26623bd417fd4075:Splice.Api.Token.MetadataV1:AnyContract'
> &
    damlTypes.FromTemplate<AnyContract, unknown> &
    AnyContractInterface

export declare type ChoiceExecutionMetadata = {
    meta: Metadata
}

export declare const ChoiceExecutionMetadata: damlTypes.Serializable<ChoiceExecutionMetadata> & {}

export declare type ExtraArgs = {
    context: ChoiceContext
    meta: Metadata
}

export declare const ExtraArgs: damlTypes.Serializable<ExtraArgs> & {}

export declare type Metadata = {
    values: { [key: string]: string }
}

export declare const Metadata: damlTypes.Serializable<Metadata> & {}

export declare type ChoiceContext = {
    values: { [key: string]: AnyValue }
}

export declare const ChoiceContext: damlTypes.Serializable<ChoiceContext> & {}

export declare type AnyContractView = {}

export declare const AnyContractView: damlTypes.Serializable<AnyContractView> & {}

export declare type AnyValue =
    | { tag: 'AV_Text'; value: string }
    | { tag: 'AV_Int'; value: damlTypes.Int }
    | { tag: 'AV_Decimal'; value: damlTypes.Numeric }
    | { tag: 'AV_Bool'; value: boolean }
    | { tag: 'AV_Date'; value: damlTypes.Date }
    | { tag: 'AV_Time'; value: damlTypes.Time }
    | {
          tag: 'AV_RelTime'
          value: pkgb70db8369e1c461d5c70f1c86f526a29e9776c655e6ffc2560f95b05ccb8b946.DA.Time.Types.RelTime
      }
    | { tag: 'AV_Party'; value: damlTypes.Party }
    | { tag: 'AV_ContractId'; value: damlTypes.ContractId<AnyContract> }
    | { tag: 'AV_List'; value: AnyValue[] }
    | { tag: 'AV_Map'; value: { [key: string]: AnyValue } }

export declare const AnyValue: damlTypes.Serializable<AnyValue> & {}
