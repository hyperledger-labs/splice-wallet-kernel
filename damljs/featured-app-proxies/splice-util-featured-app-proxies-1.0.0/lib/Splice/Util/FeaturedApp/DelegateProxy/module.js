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
var pkg7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda = require('@daml.js/splice-api-featured-app-v1-1.0.0')
var pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d = require('@daml.js/splice-api-token-allocation-v1-1.0.0')
var pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69 = require('@daml.js/ghc-stdlib-DA-Internal-Template-1.0.0')

exports.DelegateProxy_Allocation_Withdraw = {
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

exports.DelegateProxy_AllocationFactory_Allocate = {
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

exports.DelegateProxy_TransferInstruction_Withdraw = {
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

exports.DelegateProxy_TransferInstruction_Reject = {
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

exports.DelegateProxy_TransferInstruction_Accept = {
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

exports.DelegateProxy_TransferFactory_Transfer = {
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

exports.DelegateProxy = damlTypes.assembleTemplate({
    templateId:
        '#splice-util-featured-app-proxies:Splice.Util.FeaturedApp.DelegateProxy:DelegateProxy',
    templateIdWithPackageId:
        '8996f919009ea1a42d56f2f5fd486e9a647cf0d5056b5c6cdf4179d02fb8de7e:Splice.Util.FeaturedApp.DelegateProxy:DelegateProxy',
    keyDecoder: damlTypes.lazyMemo(function () {
        return jtv.constant(undefined)
    }),
    keyEncode: function () {
        throw 'EncodeError'
    },
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            provider: damlTypes.Party.decoder,
            delegate: damlTypes.Party.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            provider: damlTypes.Party.encode(__typed__.provider),
            delegate: damlTypes.Party.encode(__typed__.delegate),
        }
    },
    DelegateProxy_TransferFactory_Transfer: {
        template: function () {
            return exports.DelegateProxy
        },
        choiceName: 'DelegateProxy_TransferFactory_Transfer',
        argumentDecoder: damlTypes.lazyMemo(function () {
            return exports.DelegateProxy_TransferFactory_Transfer.decoder
        }),
        argumentEncode: function (__typed__) {
            return exports.DelegateProxy_TransferFactory_Transfer.encode(
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
    DelegateProxy_TransferInstruction_Accept: {
        template: function () {
            return exports.DelegateProxy
        },
        choiceName: 'DelegateProxy_TransferInstruction_Accept',
        argumentDecoder: damlTypes.lazyMemo(function () {
            return exports.DelegateProxy_TransferInstruction_Accept.decoder
        }),
        argumentEncode: function (__typed__) {
            return exports.DelegateProxy_TransferInstruction_Accept.encode(
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
    DelegateProxy_TransferInstruction_Reject: {
        template: function () {
            return exports.DelegateProxy
        },
        choiceName: 'DelegateProxy_TransferInstruction_Reject',
        argumentDecoder: damlTypes.lazyMemo(function () {
            return exports.DelegateProxy_TransferInstruction_Reject.decoder
        }),
        argumentEncode: function (__typed__) {
            return exports.DelegateProxy_TransferInstruction_Reject.encode(
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
    DelegateProxy_TransferInstruction_Withdraw: {
        template: function () {
            return exports.DelegateProxy
        },
        choiceName: 'DelegateProxy_TransferInstruction_Withdraw',
        argumentDecoder: damlTypes.lazyMemo(function () {
            return exports.DelegateProxy_TransferInstruction_Withdraw.decoder
        }),
        argumentEncode: function (__typed__) {
            return exports.DelegateProxy_TransferInstruction_Withdraw.encode(
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
    DelegateProxy_AllocationFactory_Allocate: {
        template: function () {
            return exports.DelegateProxy
        },
        choiceName: 'DelegateProxy_AllocationFactory_Allocate',
        argumentDecoder: damlTypes.lazyMemo(function () {
            return exports.DelegateProxy_AllocationFactory_Allocate.decoder
        }),
        argumentEncode: function (__typed__) {
            return exports.DelegateProxy_AllocationFactory_Allocate.encode(
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
    Archive: {
        template: function () {
            return exports.DelegateProxy
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
    DelegateProxy_Allocation_Withdraw: {
        template: function () {
            return exports.DelegateProxy
        },
        choiceName: 'DelegateProxy_Allocation_Withdraw',
        argumentDecoder: damlTypes.lazyMemo(function () {
            return exports.DelegateProxy_Allocation_Withdraw.decoder
        }),
        argumentEncode: function (__typed__) {
            return exports.DelegateProxy_Allocation_Withdraw.encode(__typed__)
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
})

damlTypes.registerTemplate(exports.DelegateProxy, [
    '8996f919009ea1a42d56f2f5fd486e9a647cf0d5056b5c6cdf4179d02fb8de7e',
    '#splice-util-featured-app-proxies',
])

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
                choiceArg: arg.decoder,
                featuredAppRightCid: damlTypes.ContractId(
                    pkg7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda
                        .Splice.Api.FeaturedAppRightV1.FeaturedAppRight
                ).decoder,
                beneficiaries: damlTypes.List(
                    pkg7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda
                        .Splice.Api.FeaturedAppRightV1.AppRewardBeneficiary
                ).decoder,
            })
        }),
        encode: function (__typed__) {
            return {
                choiceArg: arg.encode(__typed__.choiceArg),
                featuredAppRightCid: damlTypes
                    .ContractId(
                        pkg7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda
                            .Splice.Api.FeaturedAppRightV1.FeaturedAppRight
                    )
                    .encode(__typed__.featuredAppRightCid),
                beneficiaries: damlTypes
                    .List(
                        pkg7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda
                            .Splice.Api.FeaturedAppRightV1.AppRewardBeneficiary
                    )
                    .encode(__typed__.beneficiaries),
            }
        },
    }
}
