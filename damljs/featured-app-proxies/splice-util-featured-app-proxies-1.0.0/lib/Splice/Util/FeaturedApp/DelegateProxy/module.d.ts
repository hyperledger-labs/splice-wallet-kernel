// Generated from Splice/Util/FeaturedApp/DelegateProxy.daml
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-use-before-define */
import * as jtv from '@mojotech/json-type-validation'
import * as damlTypes from '@daml/types'

import * as pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d from '@daml.js/token-standard-models-1.0.0'
import * as pkg7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda from '@daml.js/splice-api-featured-app-v1-1.0.0'
import * as pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69 from '@daml.js/ghc-stdlib-DA-Internal-Template-1.0.0'

export declare type DelegateProxy_Allocation_Withdraw = {
    cid: damlTypes.ContractId<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.AllocationV1.Allocation>
    proxyArg: ProxyArg<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.AllocationV1.Allocation_Withdraw>
}

export declare const DelegateProxy_Allocation_Withdraw: damlTypes.Serializable<DelegateProxy_Allocation_Withdraw> & {}

export declare type DelegateProxy_AllocationFactory_Allocate = {
    cid: damlTypes.ContractId<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.AllocationInstructionV1.AllocationFactory>
    proxyArg: ProxyArg<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.AllocationInstructionV1.AllocationFactory_Allocate>
}

export declare const DelegateProxy_AllocationFactory_Allocate: damlTypes.Serializable<DelegateProxy_AllocationFactory_Allocate> & {}

export declare type DelegateProxy_TransferInstruction_Withdraw = {
    cid: damlTypes.ContractId<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferInstruction>
    proxyArg: ProxyArg<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferInstruction_Withdraw>
}

export declare const DelegateProxy_TransferInstruction_Withdraw: damlTypes.Serializable<DelegateProxy_TransferInstruction_Withdraw> & {}

export declare type DelegateProxy_TransferInstruction_Reject = {
    cid: damlTypes.ContractId<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferInstruction>
    proxyArg: ProxyArg<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferInstruction_Reject>
}

export declare const DelegateProxy_TransferInstruction_Reject: damlTypes.Serializable<DelegateProxy_TransferInstruction_Reject> & {}

export declare type DelegateProxy_TransferInstruction_Accept = {
    cid: damlTypes.ContractId<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferInstruction>
    proxyArg: ProxyArg<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferInstruction_Accept>
}

export declare const DelegateProxy_TransferInstruction_Accept: damlTypes.Serializable<DelegateProxy_TransferInstruction_Accept> & {}

export declare type DelegateProxy_TransferFactory_Transfer = {
    cid: damlTypes.ContractId<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferFactory>
    proxyArg: ProxyArg<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferFactory_Transfer>
}

export declare const DelegateProxy_TransferFactory_Transfer: damlTypes.Serializable<DelegateProxy_TransferFactory_Transfer> & {}

export declare type DelegateProxy = {
    provider: damlTypes.Party
    delegate: damlTypes.Party
}

export declare interface DelegateProxyInterface {
    DelegateProxy_TransferFactory_Transfer: damlTypes.Choice<
        DelegateProxy,
        DelegateProxy_TransferFactory_Transfer,
        ProxyResult<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferInstructionResult>,
        undefined
    > &
        damlTypes.ChoiceFrom<damlTypes.Template<DelegateProxy, undefined>>
    DelegateProxy_TransferInstruction_Accept: damlTypes.Choice<
        DelegateProxy,
        DelegateProxy_TransferInstruction_Accept,
        ProxyResult<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferInstructionResult>,
        undefined
    > &
        damlTypes.ChoiceFrom<damlTypes.Template<DelegateProxy, undefined>>
    DelegateProxy_TransferInstruction_Reject: damlTypes.Choice<
        DelegateProxy,
        DelegateProxy_TransferInstruction_Reject,
        ProxyResult<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferInstructionResult>,
        undefined
    > &
        damlTypes.ChoiceFrom<damlTypes.Template<DelegateProxy, undefined>>
    DelegateProxy_TransferInstruction_Withdraw: damlTypes.Choice<
        DelegateProxy,
        DelegateProxy_TransferInstruction_Withdraw,
        ProxyResult<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferInstructionResult>,
        undefined
    > &
        damlTypes.ChoiceFrom<damlTypes.Template<DelegateProxy, undefined>>
    DelegateProxy_AllocationFactory_Allocate: damlTypes.Choice<
        DelegateProxy,
        DelegateProxy_AllocationFactory_Allocate,
        ProxyResult<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.AllocationInstructionV1.AllocationInstructionResult>,
        undefined
    > &
        damlTypes.ChoiceFrom<damlTypes.Template<DelegateProxy, undefined>>
    Archive: damlTypes.Choice<
        DelegateProxy,
        pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive,
        {},
        undefined
    > &
        damlTypes.ChoiceFrom<damlTypes.Template<DelegateProxy, undefined>>
    DelegateProxy_Allocation_Withdraw: damlTypes.Choice<
        DelegateProxy,
        DelegateProxy_Allocation_Withdraw,
        ProxyResult<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.AllocationV1.Allocation_WithdrawResult>,
        undefined
    > &
        damlTypes.ChoiceFrom<damlTypes.Template<DelegateProxy, undefined>>
}
export declare const DelegateProxy: damlTypes.Template<
    DelegateProxy,
    undefined,
    '#splice-util-featured-app-proxies:Splice.Util.FeaturedApp.DelegateProxy:DelegateProxy'
> &
    damlTypes.ToInterface<DelegateProxy, never> &
    DelegateProxyInterface

export declare namespace DelegateProxy {}

export declare type ProxyResult<r> = {
    markerResult: pkg7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda.Splice.Api.FeaturedAppRightV1.FeaturedAppRight_CreateActivityMarkerResult
    choiceResult: r
}

export declare const ProxyResult: (<r>(
    r: damlTypes.Serializable<r>
) => damlTypes.Serializable<ProxyResult<r>>) & {}

export declare type ProxyArg<arg> = {
    choiceArg: arg
    featuredAppRightCid: damlTypes.ContractId<pkg7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda.Splice.Api.FeaturedAppRightV1.FeaturedAppRight>
    beneficiaries: pkg7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda.Splice.Api.FeaturedAppRightV1.AppRewardBeneficiary[]
}

export declare const ProxyArg: (<arg>(
    arg: damlTypes.Serializable<arg>
) => damlTypes.Serializable<ProxyArg<arg>>) & {}
