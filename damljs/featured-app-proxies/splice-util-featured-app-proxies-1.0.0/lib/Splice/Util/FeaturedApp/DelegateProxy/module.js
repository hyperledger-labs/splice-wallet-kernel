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

var pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d = require('@daml.js/token-standard-models-1.0.0')
var pkg7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda = require('@daml.js/splice-api-featured-app-v1-1.0.0')
var pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69 = require('@daml.js/ghc-stdlib-DA-Internal-Template-1.0.0')

exports.DelegateProxy_Allocation_Withdraw = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            cid: damlTypes.ContractId(
                pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
                    .Splice.Api.Token.AllocationV1.Allocation
            ).decoder,
            proxyArg: exports.ProxyArg(
                pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
                    .Splice.Api.Token.AllocationV1.Allocation_Withdraw
            ).decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            cid: damlTypes
                .ContractId(
                    pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
                        .Splice.Api.Token.AllocationV1.Allocation
                )
                .encode(__typed__.cid),
            proxyArg: exports
                .ProxyArg(
                    pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
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
                pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
                    .Splice.Api.Token.AllocationInstructionV1.AllocationFactory
            ).decoder,
            proxyArg: exports.ProxyArg(
                pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
                    .Splice.Api.Token.AllocationInstructionV1
                    .AllocationFactory_Allocate
            ).decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            cid: damlTypes
                .ContractId(
                    pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
                        .Splice.Api.Token.AllocationInstructionV1
                        .AllocationFactory
                )
                .encode(__typed__.cid),
            proxyArg: exports
                .ProxyArg(
                    pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
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
                pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
                    .Splice.Api.Token.TransferInstructionV1.TransferInstruction
            ).decoder,
            proxyArg: exports.ProxyArg(
                pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
                    .Splice.Api.Token.TransferInstructionV1
                    .TransferInstruction_Withdraw
            ).decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            cid: damlTypes
                .ContractId(
                    pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
                        .Splice.Api.Token.TransferInstructionV1
                        .TransferInstruction
                )
                .encode(__typed__.cid),
            proxyArg: exports
                .ProxyArg(
                    pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
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
                pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
                    .Splice.Api.Token.TransferInstructionV1.TransferInstruction
            ).decoder,
            proxyArg: exports.ProxyArg(
                pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
                    .Splice.Api.Token.TransferInstructionV1
                    .TransferInstruction_Reject
            ).decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            cid: damlTypes
                .ContractId(
                    pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
                        .Splice.Api.Token.TransferInstructionV1
                        .TransferInstruction
                )
                .encode(__typed__.cid),
            proxyArg: exports
                .ProxyArg(
                    pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
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
                pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
                    .Splice.Api.Token.TransferInstructionV1.TransferInstruction
            ).decoder,
            proxyArg: exports.ProxyArg(
                pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
                    .Splice.Api.Token.TransferInstructionV1
                    .TransferInstruction_Accept
            ).decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            cid: damlTypes
                .ContractId(
                    pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
                        .Splice.Api.Token.TransferInstructionV1
                        .TransferInstruction
                )
                .encode(__typed__.cid),
            proxyArg: exports
                .ProxyArg(
                    pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
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
                pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
                    .Splice.Api.Token.TransferInstructionV1.TransferFactory
            ).decoder,
            proxyArg: exports.ProxyArg(
                pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
                    .Splice.Api.Token.TransferInstructionV1
                    .TransferFactory_Transfer
            ).decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            cid: damlTypes
                .ContractId(
                    pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
                        .Splice.Api.Token.TransferInstructionV1.TransferFactory
                )
                .encode(__typed__.cid),
            proxyArg: exports
                .ProxyArg(
                    pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
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
        'a8523b79a6428ee47c9a24af631b0faf8636e0e2cd32748f02f7d3ff3de0b742:Splice.Util.FeaturedApp.DelegateProxy:DelegateProxy',
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
                pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
                    .Splice.Api.Token.TransferInstructionV1
                    .TransferInstructionResult
            ).decoder
        }),
        resultEncode: function (__typed__) {
            return exports
                .ProxyResult(
                    pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
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
                pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
                    .Splice.Api.Token.TransferInstructionV1
                    .TransferInstructionResult
            ).decoder
        }),
        resultEncode: function (__typed__) {
            return exports
                .ProxyResult(
                    pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
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
                pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
                    .Splice.Api.Token.TransferInstructionV1
                    .TransferInstructionResult
            ).decoder
        }),
        resultEncode: function (__typed__) {
            return exports
                .ProxyResult(
                    pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
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
                pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
                    .Splice.Api.Token.TransferInstructionV1
                    .TransferInstructionResult
            ).decoder
        }),
        resultEncode: function (__typed__) {
            return exports
                .ProxyResult(
                    pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
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
                pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
                    .Splice.Api.Token.AllocationInstructionV1
                    .AllocationInstructionResult
            ).decoder
        }),
        resultEncode: function (__typed__) {
            return exports
                .ProxyResult(
                    pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
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
                pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
                    .Splice.Api.Token.AllocationV1.Allocation_WithdrawResult
            ).decoder
        }),
        resultEncode: function (__typed__) {
            return exports
                .ProxyResult(
                    pkg3c373f302ebb5531459ceca3b6f0409365d119767ffe2026a04e6bd750dae10d
                        .Splice.Api.Token.AllocationV1.Allocation_WithdrawResult
                )
                .encode(__typed__)
        },
    },
})

damlTypes.registerTemplate(exports.DelegateProxy, [
    'a8523b79a6428ee47c9a24af631b0faf8636e0e2cd32748f02f7d3ff3de0b742',
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
