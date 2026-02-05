// Generated from Splice/Util/FeaturedApp/WalletUserProxy.daml
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-use-before-define */
import * as jtv from '@mojotech/json-type-validation'
import * as damlTypes from '@daml/types'

import * as pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d from '@daml.js/token-standard-models-1.0.0'
import * as pkg7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda from '@daml.js/splice-api-featured-app-v1-1.0.0'
import * as pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69 from '@daml.js/ghc-stdlib-DA-Internal-Template-1.0.0'

export declare type WalletUserProxy_BatchTransferResult = {
    transferResults: pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferInstructionResult[]
    senderChangeMap: damlTypes.Map<
        pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.HoldingV1.InstrumentId,
        damlTypes.ContractId<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.HoldingV1.Holding>[]
    >
}

export declare const WalletUserProxy_BatchTransferResult: damlTypes.Serializable<WalletUserProxy_BatchTransferResult> & {}

export declare type WalletUserProxy_BatchTransfer = {
    transferCalls: TransferFactoryCall[]
    optFeaturedAppRightCid: damlTypes.Optional<
        damlTypes.ContractId<pkg7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda.Splice.Api.FeaturedAppRightV1.FeaturedAppRight>
    >
}

export declare const WalletUserProxy_BatchTransfer: damlTypes.Serializable<WalletUserProxy_BatchTransfer> & {}

export declare type WalletUserProxy_Allocation_Withdraw = {
    cid: damlTypes.ContractId<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.AllocationV1.Allocation>
    proxyArg: ProxyArg<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.AllocationV1.Allocation_Withdraw>
}

export declare const WalletUserProxy_Allocation_Withdraw: damlTypes.Serializable<WalletUserProxy_Allocation_Withdraw> & {}

export declare type WalletUserProxy_AllocationFactory_Allocate = {
    cid: damlTypes.ContractId<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.AllocationInstructionV1.AllocationFactory>
    proxyArg: ProxyArg<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.AllocationInstructionV1.AllocationFactory_Allocate>
}

export declare const WalletUserProxy_AllocationFactory_Allocate: damlTypes.Serializable<WalletUserProxy_AllocationFactory_Allocate> & {}

export declare type WalletUserProxy_TransferInstruction_Withdraw = {
    cid: damlTypes.ContractId<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferInstruction>
    proxyArg: ProxyArg<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferInstruction_Withdraw>
}

export declare const WalletUserProxy_TransferInstruction_Withdraw: damlTypes.Serializable<WalletUserProxy_TransferInstruction_Withdraw> & {}

export declare type WalletUserProxy_TransferInstruction_Reject = {
    cid: damlTypes.ContractId<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferInstruction>
    proxyArg: ProxyArg<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferInstruction_Reject>
}

export declare const WalletUserProxy_TransferInstruction_Reject: damlTypes.Serializable<WalletUserProxy_TransferInstruction_Reject> & {}

export declare type WalletUserProxy_TransferInstruction_Accept = {
    cid: damlTypes.ContractId<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferInstruction>
    proxyArg: ProxyArg<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferInstruction_Accept>
}

export declare const WalletUserProxy_TransferInstruction_Accept: damlTypes.Serializable<WalletUserProxy_TransferInstruction_Accept> & {}

export declare type WalletUserProxy_TransferFactory_Transfer = {
    cid: damlTypes.ContractId<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferFactory>
    proxyArg: ProxyArg<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferFactory_Transfer>
}

export declare const WalletUserProxy_TransferFactory_Transfer: damlTypes.Serializable<WalletUserProxy_TransferFactory_Transfer> & {}

export declare type WalletUserProxy_PublicFetch = {
    actor: damlTypes.Party
}

export declare const WalletUserProxy_PublicFetch: damlTypes.Serializable<WalletUserProxy_PublicFetch> & {}

export declare type WalletUserProxy = {
    provider: damlTypes.Party
    providerWeight: damlTypes.Numeric
    userWeight: damlTypes.Numeric
    extraBeneficiaries: pkg7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda.Splice.Api.FeaturedAppRightV1.AppRewardBeneficiary[]
    optAllowList: damlTypes.Optional<damlTypes.Party[]>
}

export declare interface WalletUserProxyInterface {
    WalletUserProxy_BatchTransfer: damlTypes.Choice<
        WalletUserProxy,
        WalletUserProxy_BatchTransfer,
        WalletUserProxy_BatchTransferResult,
        undefined
    > &
        damlTypes.ChoiceFrom<damlTypes.Template<WalletUserProxy, undefined>>
    WalletUserProxy_TransferFactory_Transfer: damlTypes.Choice<
        WalletUserProxy,
        WalletUserProxy_TransferFactory_Transfer,
        ProxyResult<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferInstructionResult>,
        undefined
    > &
        damlTypes.ChoiceFrom<damlTypes.Template<WalletUserProxy, undefined>>
    WalletUserProxy_TransferInstruction_Accept: damlTypes.Choice<
        WalletUserProxy,
        WalletUserProxy_TransferInstruction_Accept,
        ProxyResult<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferInstructionResult>,
        undefined
    > &
        damlTypes.ChoiceFrom<damlTypes.Template<WalletUserProxy, undefined>>
    WalletUserProxy_TransferInstruction_Reject: damlTypes.Choice<
        WalletUserProxy,
        WalletUserProxy_TransferInstruction_Reject,
        ProxyResult<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferInstructionResult>,
        undefined
    > &
        damlTypes.ChoiceFrom<damlTypes.Template<WalletUserProxy, undefined>>
    WalletUserProxy_TransferInstruction_Withdraw: damlTypes.Choice<
        WalletUserProxy,
        WalletUserProxy_TransferInstruction_Withdraw,
        ProxyResult<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferInstructionResult>,
        undefined
    > &
        damlTypes.ChoiceFrom<damlTypes.Template<WalletUserProxy, undefined>>
    WalletUserProxy_AllocationFactory_Allocate: damlTypes.Choice<
        WalletUserProxy,
        WalletUserProxy_AllocationFactory_Allocate,
        ProxyResult<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.AllocationInstructionV1.AllocationInstructionResult>,
        undefined
    > &
        damlTypes.ChoiceFrom<damlTypes.Template<WalletUserProxy, undefined>>
    WalletUserProxy_Allocation_Withdraw: damlTypes.Choice<
        WalletUserProxy,
        WalletUserProxy_Allocation_Withdraw,
        ProxyResult<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.AllocationV1.Allocation_WithdrawResult>,
        undefined
    > &
        damlTypes.ChoiceFrom<damlTypes.Template<WalletUserProxy, undefined>>
    Archive: damlTypes.Choice<
        WalletUserProxy,
        pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive,
        {},
        undefined
    > &
        damlTypes.ChoiceFrom<damlTypes.Template<WalletUserProxy, undefined>>
    WalletUserProxy_PublicFetch: damlTypes.Choice<
        WalletUserProxy,
        WalletUserProxy_PublicFetch,
        WalletUserProxy,
        undefined
    > &
        damlTypes.ChoiceFrom<damlTypes.Template<WalletUserProxy, undefined>>
}
export declare const WalletUserProxy: damlTypes.Template<
    WalletUserProxy,
    undefined,
    '#splice-util-featured-app-proxies:Splice.Util.FeaturedApp.WalletUserProxy:WalletUserProxy'
> &
    damlTypes.ToInterface<WalletUserProxy, never> &
    WalletUserProxyInterface

export declare namespace WalletUserProxy {}

export declare type TransferFactoryCall = {
    factoryCid: damlTypes.ContractId<pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferFactory>
    choiceArg: pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d.Splice.Api.Token.TransferInstructionV1.TransferFactory_Transfer
}

export declare const TransferFactoryCall: damlTypes.Serializable<TransferFactoryCall> & {}

export declare type ProxyResult<r> = {
    markerResult: pkg7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda.Splice.Api.FeaturedAppRightV1.FeaturedAppRight_CreateActivityMarkerResult
    choiceResult: r
}

export declare const ProxyResult: (<r>(
    r: damlTypes.Serializable<r>
) => damlTypes.Serializable<ProxyResult<r>>) & {}

export declare type ProxyArg<arg> = {
    user: damlTypes.Party
    choiceArg: arg
    featuredAppRightCid: damlTypes.ContractId<pkg7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda.Splice.Api.FeaturedAppRightV1.FeaturedAppRight>
}

export declare const ProxyArg: (<arg>(
    arg: damlTypes.Serializable<arg>
) => damlTypes.Serializable<ProxyArg<arg>>) & {}
