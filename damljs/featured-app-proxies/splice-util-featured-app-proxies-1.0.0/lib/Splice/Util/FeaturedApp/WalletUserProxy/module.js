'use strict'
/* eslint-disable-next-line no-unused-vars */
function __export(m) {
    /* eslint-disable-next-line no-prototype-builtins */
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p]
}
Object.defineProperty(exports, '__esModule', { value: true })
/* eslint-disable-next-line no-unused-vars */
var jtv = require('@mojotech/json-type-validation')
/* eslint-disable-next-line no-unused-vars */
var damlTypes = require('@daml/types')

var pkg275064aacfe99cea72ee0c80563936129563776f67415ef9f13e4297eecbc520 = require('@daml.js/splice-api-token-allocation-instruction-v1-1.0.0')
var pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281 = require('@daml.js/splice-api-token-transfer-instruction-v1-1.0.0')
var pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b = require('@daml.js/splice-api-token-holding-v1-1.0.0')
var pkg7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda = require('@daml.js/splice-api-featured-app-v1-1.0.0')
var pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d = require('@daml.js/splice-api-token-allocation-v1-1.0.0')
var pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69 = require('@daml.js/ghc-stdlib-DA-Internal-Template-1.0.0')

exports.WalletUserProxy_BatchTransferResult = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            transferResults: damlTypes.List(
                pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                    .Splice.Api.Token.TransferInstructionV1
                    .TransferInstructionResult
            ).decoder,
            senderChangeMap: damlTypes.Map(
                pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b
                    .Splice.Api.Token.HoldingV1.InstrumentId,
                damlTypes.List(
                    damlTypes.ContractId(
                        pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b
                            .Splice.Api.Token.HoldingV1.Holding
                    )
                )
            ).decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            transferResults: damlTypes
                .List(
                    pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                        .Splice.Api.Token.TransferInstructionV1
                        .TransferInstructionResult
                )
                .encode(__typed__.transferResults),
            senderChangeMap: damlTypes
                .Map(
                    pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b
                        .Splice.Api.Token.HoldingV1.InstrumentId,
                    damlTypes.List(
                        damlTypes.ContractId(
                            pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b
                                .Splice.Api.Token.HoldingV1.Holding
                        )
                    )
                )
                .encode(__typed__.senderChangeMap),
        }
    },
}

exports.WalletUserProxy_BatchTransfer = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            transferCalls: damlTypes.List(exports.TransferFactoryCall).decoder,
            optFeaturedAppRightCid: jtv.Decoder.withDefault(
                null,
                damlTypes.Optional(
                    damlTypes.ContractId(
                        pkg7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda
                            .Splice.Api.FeaturedAppRightV1.FeaturedAppRight
                    )
                ).decoder
            ),
        })
    }),
    encode: function (__typed__) {
        return {
            transferCalls: damlTypes
                .List(exports.TransferFactoryCall)
                .encode(__typed__.transferCalls),
            optFeaturedAppRightCid: damlTypes
                .Optional(
                    damlTypes.ContractId(
                        pkg7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda
                            .Splice.Api.FeaturedAppRightV1.FeaturedAppRight
                    )
                )
                .encode(__typed__.optFeaturedAppRightCid),
        }
    },
}

exports.WalletUserProxy_Allocation_Withdraw = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            cid: damlTypes.ContractId(
                pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d
                    .Splice.Api.Token.AllocationV1.Allocation
            ).decoder,
            proxyArg: exports.ProxyArg(
                pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d
                    .Splice.Api.Token.AllocationV1.Allocation_Withdraw
            ).decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            cid: damlTypes
                .ContractId(
                    pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d
                        .Splice.Api.Token.AllocationV1.Allocation
                )
                .encode(__typed__.cid),
            proxyArg: exports
                .ProxyArg(
                    pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d
                        .Splice.Api.Token.AllocationV1.Allocation_Withdraw
                )
                .encode(__typed__.proxyArg),
        }
    },
}

exports.WalletUserProxy_AllocationFactory_Allocate = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            cid: damlTypes.ContractId(
                pkg275064aacfe99cea72ee0c80563936129563776f67415ef9f13e4297eecbc520
                    .Splice.Api.Token.AllocationInstructionV1.AllocationFactory
            ).decoder,
            proxyArg: exports.ProxyArg(
                pkg275064aacfe99cea72ee0c80563936129563776f67415ef9f13e4297eecbc520
                    .Splice.Api.Token.AllocationInstructionV1
                    .AllocationFactory_Allocate
            ).decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            cid: damlTypes
                .ContractId(
                    pkg275064aacfe99cea72ee0c80563936129563776f67415ef9f13e4297eecbc520
                        .Splice.Api.Token.AllocationInstructionV1
                        .AllocationFactory
                )
                .encode(__typed__.cid),
            proxyArg: exports
                .ProxyArg(
                    pkg275064aacfe99cea72ee0c80563936129563776f67415ef9f13e4297eecbc520
                        .Splice.Api.Token.AllocationInstructionV1
                        .AllocationFactory_Allocate
                )
                .encode(__typed__.proxyArg),
        }
    },
}

exports.WalletUserProxy_TransferInstruction_Withdraw = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            cid: damlTypes.ContractId(
                pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                    .Splice.Api.Token.TransferInstructionV1.TransferInstruction
            ).decoder,
            proxyArg: exports.ProxyArg(
                pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                    .Splice.Api.Token.TransferInstructionV1
                    .TransferInstruction_Withdraw
            ).decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            cid: damlTypes
                .ContractId(
                    pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                        .Splice.Api.Token.TransferInstructionV1
                        .TransferInstruction
                )
                .encode(__typed__.cid),
            proxyArg: exports
                .ProxyArg(
                    pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                        .Splice.Api.Token.TransferInstructionV1
                        .TransferInstruction_Withdraw
                )
                .encode(__typed__.proxyArg),
        }
    },
}

exports.WalletUserProxy_TransferInstruction_Reject = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            cid: damlTypes.ContractId(
                pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                    .Splice.Api.Token.TransferInstructionV1.TransferInstruction
            ).decoder,
            proxyArg: exports.ProxyArg(
                pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                    .Splice.Api.Token.TransferInstructionV1
                    .TransferInstruction_Reject
            ).decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            cid: damlTypes
                .ContractId(
                    pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                        .Splice.Api.Token.TransferInstructionV1
                        .TransferInstruction
                )
                .encode(__typed__.cid),
            proxyArg: exports
                .ProxyArg(
                    pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                        .Splice.Api.Token.TransferInstructionV1
                        .TransferInstruction_Reject
                )
                .encode(__typed__.proxyArg),
        }
    },
}

exports.WalletUserProxy_TransferInstruction_Accept = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            cid: damlTypes.ContractId(
                pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                    .Splice.Api.Token.TransferInstructionV1.TransferInstruction
            ).decoder,
            proxyArg: exports.ProxyArg(
                pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                    .Splice.Api.Token.TransferInstructionV1
                    .TransferInstruction_Accept
            ).decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            cid: damlTypes
                .ContractId(
                    pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                        .Splice.Api.Token.TransferInstructionV1
                        .TransferInstruction
                )
                .encode(__typed__.cid),
            proxyArg: exports
                .ProxyArg(
                    pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                        .Splice.Api.Token.TransferInstructionV1
                        .TransferInstruction_Accept
                )
                .encode(__typed__.proxyArg),
        }
    },
}

exports.WalletUserProxy_TransferFactory_Transfer = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            cid: damlTypes.ContractId(
                pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                    .Splice.Api.Token.TransferInstructionV1.TransferFactory
            ).decoder,
            proxyArg: exports.ProxyArg(
                pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                    .Splice.Api.Token.TransferInstructionV1
                    .TransferFactory_Transfer
            ).decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            cid: damlTypes
                .ContractId(
                    pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                        .Splice.Api.Token.TransferInstructionV1.TransferFactory
                )
                .encode(__typed__.cid),
            proxyArg: exports
                .ProxyArg(
                    pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                        .Splice.Api.Token.TransferInstructionV1
                        .TransferFactory_Transfer
                )
                .encode(__typed__.proxyArg),
        }
    },
}

exports.WalletUserProxy_PublicFetch = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({ actor: damlTypes.Party.decoder })
    }),
    encode: function (__typed__) {
        return {
            actor: damlTypes.Party.encode(__typed__.actor),
        }
    },
}

exports.WalletUserProxy = damlTypes.assembleTemplate({
    templateId:
        '#splice-util-featured-app-proxies:Splice.Util.FeaturedApp.WalletUserProxy:WalletUserProxy',
    templateIdWithPackageId:
        '8996f919009ea1a42d56f2f5fd486e9a647cf0d5056b5c6cdf4179d02fb8de7e:Splice.Util.FeaturedApp.WalletUserProxy:WalletUserProxy',
    keyDecoder: damlTypes.lazyMemo(function () {
        return jtv.constant(undefined)
    }),
    keyEncode: function () {
        throw 'EncodeError'
    },
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            provider: damlTypes.Party.decoder,
            providerWeight: damlTypes.Numeric(10).decoder,
            userWeight: damlTypes.Numeric(10).decoder,
            extraBeneficiaries: damlTypes.List(
                pkg7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda
                    .Splice.Api.FeaturedAppRightV1.AppRewardBeneficiary
            ).decoder,
            optAllowList: jtv.Decoder.withDefault(
                null,
                damlTypes.Optional(damlTypes.List(damlTypes.Party)).decoder
            ),
        })
    }),
    encode: function (__typed__) {
        return {
            provider: damlTypes.Party.encode(__typed__.provider),
            providerWeight: damlTypes
                .Numeric(10)
                .encode(__typed__.providerWeight),
            userWeight: damlTypes.Numeric(10).encode(__typed__.userWeight),
            extraBeneficiaries: damlTypes
                .List(
                    pkg7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda
                        .Splice.Api.FeaturedAppRightV1.AppRewardBeneficiary
                )
                .encode(__typed__.extraBeneficiaries),
            optAllowList: damlTypes
                .Optional(damlTypes.List(damlTypes.Party))
                .encode(__typed__.optAllowList),
        }
    },
    WalletUserProxy_BatchTransfer: {
        template: function () {
            return exports.WalletUserProxy
        },
        choiceName: 'WalletUserProxy_BatchTransfer',
        argumentDecoder: damlTypes.lazyMemo(function () {
            return exports.WalletUserProxy_BatchTransfer.decoder
        }),
        argumentEncode: function (__typed__) {
            return exports.WalletUserProxy_BatchTransfer.encode(__typed__)
        },
        resultDecoder: damlTypes.lazyMemo(function () {
            return exports.WalletUserProxy_BatchTransferResult.decoder
        }),
        resultEncode: function (__typed__) {
            return exports.WalletUserProxy_BatchTransferResult.encode(__typed__)
        },
    },
    WalletUserProxy_TransferFactory_Transfer: {
        template: function () {
            return exports.WalletUserProxy
        },
        choiceName: 'WalletUserProxy_TransferFactory_Transfer',
        argumentDecoder: damlTypes.lazyMemo(function () {
            return exports.WalletUserProxy_TransferFactory_Transfer.decoder
        }),
        argumentEncode: function (__typed__) {
            return exports.WalletUserProxy_TransferFactory_Transfer.encode(
                __typed__
            )
        },
        resultDecoder: damlTypes.lazyMemo(function () {
            return exports.ProxyResult(
                pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                    .Splice.Api.Token.TransferInstructionV1
                    .TransferInstructionResult
            ).decoder
        }),
        resultEncode: function (__typed__) {
            return exports
                .ProxyResult(
                    pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                        .Splice.Api.Token.TransferInstructionV1
                        .TransferInstructionResult
                )
                .encode(__typed__)
        },
    },
    WalletUserProxy_TransferInstruction_Accept: {
        template: function () {
            return exports.WalletUserProxy
        },
        choiceName: 'WalletUserProxy_TransferInstruction_Accept',
        argumentDecoder: damlTypes.lazyMemo(function () {
            return exports.WalletUserProxy_TransferInstruction_Accept.decoder
        }),
        argumentEncode: function (__typed__) {
            return exports.WalletUserProxy_TransferInstruction_Accept.encode(
                __typed__
            )
        },
        resultDecoder: damlTypes.lazyMemo(function () {
            return exports.ProxyResult(
                pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                    .Splice.Api.Token.TransferInstructionV1
                    .TransferInstructionResult
            ).decoder
        }),
        resultEncode: function (__typed__) {
            return exports
                .ProxyResult(
                    pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                        .Splice.Api.Token.TransferInstructionV1
                        .TransferInstructionResult
                )
                .encode(__typed__)
        },
    },
    WalletUserProxy_TransferInstruction_Reject: {
        template: function () {
            return exports.WalletUserProxy
        },
        choiceName: 'WalletUserProxy_TransferInstruction_Reject',
        argumentDecoder: damlTypes.lazyMemo(function () {
            return exports.WalletUserProxy_TransferInstruction_Reject.decoder
        }),
        argumentEncode: function (__typed__) {
            return exports.WalletUserProxy_TransferInstruction_Reject.encode(
                __typed__
            )
        },
        resultDecoder: damlTypes.lazyMemo(function () {
            return exports.ProxyResult(
                pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                    .Splice.Api.Token.TransferInstructionV1
                    .TransferInstructionResult
            ).decoder
        }),
        resultEncode: function (__typed__) {
            return exports
                .ProxyResult(
                    pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                        .Splice.Api.Token.TransferInstructionV1
                        .TransferInstructionResult
                )
                .encode(__typed__)
        },
    },
    WalletUserProxy_TransferInstruction_Withdraw: {
        template: function () {
            return exports.WalletUserProxy
        },
        choiceName: 'WalletUserProxy_TransferInstruction_Withdraw',
        argumentDecoder: damlTypes.lazyMemo(function () {
            return exports.WalletUserProxy_TransferInstruction_Withdraw.decoder
        }),
        argumentEncode: function (__typed__) {
            return exports.WalletUserProxy_TransferInstruction_Withdraw.encode(
                __typed__
            )
        },
        resultDecoder: damlTypes.lazyMemo(function () {
            return exports.ProxyResult(
                pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                    .Splice.Api.Token.TransferInstructionV1
                    .TransferInstructionResult
            ).decoder
        }),
        resultEncode: function (__typed__) {
            return exports
                .ProxyResult(
                    pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                        .Splice.Api.Token.TransferInstructionV1
                        .TransferInstructionResult
                )
                .encode(__typed__)
        },
    },
    WalletUserProxy_AllocationFactory_Allocate: {
        template: function () {
            return exports.WalletUserProxy
        },
        choiceName: 'WalletUserProxy_AllocationFactory_Allocate',
        argumentDecoder: damlTypes.lazyMemo(function () {
            return exports.WalletUserProxy_AllocationFactory_Allocate.decoder
        }),
        argumentEncode: function (__typed__) {
            return exports.WalletUserProxy_AllocationFactory_Allocate.encode(
                __typed__
            )
        },
        resultDecoder: damlTypes.lazyMemo(function () {
            return exports.ProxyResult(
                pkg275064aacfe99cea72ee0c80563936129563776f67415ef9f13e4297eecbc520
                    .Splice.Api.Token.AllocationInstructionV1
                    .AllocationInstructionResult
            ).decoder
        }),
        resultEncode: function (__typed__) {
            return exports
                .ProxyResult(
                    pkg275064aacfe99cea72ee0c80563936129563776f67415ef9f13e4297eecbc520
                        .Splice.Api.Token.AllocationInstructionV1
                        .AllocationInstructionResult
                )
                .encode(__typed__)
        },
    },
    WalletUserProxy_Allocation_Withdraw: {
        template: function () {
            return exports.WalletUserProxy
        },
        choiceName: 'WalletUserProxy_Allocation_Withdraw',
        argumentDecoder: damlTypes.lazyMemo(function () {
            return exports.WalletUserProxy_Allocation_Withdraw.decoder
        }),
        argumentEncode: function (__typed__) {
            return exports.WalletUserProxy_Allocation_Withdraw.encode(__typed__)
        },
        resultDecoder: damlTypes.lazyMemo(function () {
            return exports.ProxyResult(
                pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d
                    .Splice.Api.Token.AllocationV1.Allocation_WithdrawResult
            ).decoder
        }),
        resultEncode: function (__typed__) {
            return exports
                .ProxyResult(
                    pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d
                        .Splice.Api.Token.AllocationV1.Allocation_WithdrawResult
                )
                .encode(__typed__)
        },
    },
    Archive: {
        template: function () {
            return exports.WalletUserProxy
        },
        choiceName: 'Archive',
        argumentDecoder: damlTypes.lazyMemo(function () {
            return pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69
                .DA.Internal.Template.Archive.decoder
        }),
        argumentEncode: function (__typed__) {
            return pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive.encode(
                __typed__
            )
        },
        resultDecoder: damlTypes.lazyMemo(function () {
            return damlTypes.Unit.decoder
        }),
        resultEncode: function (__typed__) {
            return damlTypes.Unit.encode(__typed__)
        },
    },
    WalletUserProxy_PublicFetch: {
        template: function () {
            return exports.WalletUserProxy
        },
        choiceName: 'WalletUserProxy_PublicFetch',
        argumentDecoder: damlTypes.lazyMemo(function () {
            return exports.WalletUserProxy_PublicFetch.decoder
        }),
        argumentEncode: function (__typed__) {
            return exports.WalletUserProxy_PublicFetch.encode(__typed__)
        },
        resultDecoder: damlTypes.lazyMemo(function () {
            return exports.WalletUserProxy.decoder
        }),
        resultEncode: function (__typed__) {
            return exports.WalletUserProxy.encode(__typed__)
        },
    },
})

damlTypes.registerTemplate(exports.WalletUserProxy, [
    '8996f919009ea1a42d56f2f5fd486e9a647cf0d5056b5c6cdf4179d02fb8de7e',
    '#splice-util-featured-app-proxies',
])

exports.TransferFactoryCall = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            factoryCid: damlTypes.ContractId(
                pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                    .Splice.Api.Token.TransferInstructionV1.TransferFactory
            ).decoder,
            choiceArg:
                pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                    .Splice.Api.Token.TransferInstructionV1
                    .TransferFactory_Transfer.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            factoryCid: damlTypes
                .ContractId(
                    pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281
                        .Splice.Api.Token.TransferInstructionV1.TransferFactory
                )
                .encode(__typed__.factoryCid),
            choiceArg:
                pkg55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281.Splice.Api.Token.TransferInstructionV1.TransferFactory_Transfer.encode(
                    __typed__.choiceArg
                ),
        }
    },
}

exports.ProxyResult = function (r) {
    return {
        decoder: damlTypes.lazyMemo(function () {
            return jtv.object({
                markerResult:
                    pkg7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda
                        .Splice.Api.FeaturedAppRightV1
                        .FeaturedAppRight_CreateActivityMarkerResult.decoder,
                choiceResult: r.decoder,
            })
        }),
        encode: function (__typed__) {
            return {
                markerResult:
                    pkg7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda.Splice.Api.FeaturedAppRightV1.FeaturedAppRight_CreateActivityMarkerResult.encode(
                        __typed__.markerResult
                    ),
                choiceResult: r.encode(__typed__.choiceResult),
            }
        },
    }
}

exports.ProxyArg = function (arg) {
    return {
        decoder: damlTypes.lazyMemo(function () {
            return jtv.object({
                user: damlTypes.Party.decoder,
                choiceArg: arg.decoder,
                featuredAppRightCid: damlTypes.ContractId(
                    pkg7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda
                        .Splice.Api.FeaturedAppRightV1.FeaturedAppRight
                ).decoder,
            })
        }),
        encode: function (__typed__) {
            return {
                user: damlTypes.Party.encode(__typed__.user),
                choiceArg: arg.encode(__typed__.choiceArg),
                featuredAppRightCid: damlTypes
                    .ContractId(
                        pkg7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda
                            .Splice.Api.FeaturedAppRightV1.FeaturedAppRight
                    )
                    .encode(__typed__.featuredAppRightCid),
            }
        },
    }
}
