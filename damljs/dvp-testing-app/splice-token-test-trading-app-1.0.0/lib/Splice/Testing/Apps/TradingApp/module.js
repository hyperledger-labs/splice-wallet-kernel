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

var pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f = require('@daml.js/splice-api-token-metadata-v1-1.0.0')
var pkg5aee9b21b8e9a4c4975b5f4c4198e6e6e8469df49e2010820e792f393db870f4 = require('@daml.js/daml-prim-DA-Types-1.0.0')
var pkg6fe848530b2404017c4a12874c956ad7d5c8a419ee9b040f96b5c13172d2e193 = require('@daml.js/splice-api-token-allocation-request-v1-1.0.0')
var pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d = require('@daml.js/splice-api-token-allocation-v1-1.0.0')
var pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69 = require('@daml.js/ghc-stdlib-DA-Internal-Template-1.0.0')

exports.OTCTrade_Cancel = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            allocationsWithContext: damlTypes.TextMap(
                pkg5aee9b21b8e9a4c4975b5f4c4198e6e6e8469df49e2010820e792f393db870f4.DA.Types.Tuple2(
                    damlTypes.ContractId(
                        pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d
                            .Splice.Api.Token.AllocationV1.Allocation
                    ),
                    pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f
                        .Splice.Api.Token.MetadataV1.ExtraArgs
                )
            ).decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            allocationsWithContext: damlTypes
                .TextMap(
                    pkg5aee9b21b8e9a4c4975b5f4c4198e6e6e8469df49e2010820e792f393db870f4.DA.Types.Tuple2(
                        damlTypes.ContractId(
                            pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d
                                .Splice.Api.Token.AllocationV1.Allocation
                        ),
                        pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f
                            .Splice.Api.Token.MetadataV1.ExtraArgs
                    )
                )
                .encode(__typed__.allocationsWithContext),
        }
    },
}

exports.OTCTrade_Settle = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            allocationsWithContext: damlTypes.TextMap(
                pkg5aee9b21b8e9a4c4975b5f4c4198e6e6e8469df49e2010820e792f393db870f4.DA.Types.Tuple2(
                    damlTypes.ContractId(
                        pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d
                            .Splice.Api.Token.AllocationV1.Allocation
                    ),
                    pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f
                        .Splice.Api.Token.MetadataV1.ExtraArgs
                )
            ).decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            allocationsWithContext: damlTypes
                .TextMap(
                    pkg5aee9b21b8e9a4c4975b5f4c4198e6e6e8469df49e2010820e792f393db870f4.DA.Types.Tuple2(
                        damlTypes.ContractId(
                            pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d
                                .Splice.Api.Token.AllocationV1.Allocation
                        ),
                        pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f
                            .Splice.Api.Token.MetadataV1.ExtraArgs
                    )
                )
                .encode(__typed__.allocationsWithContext),
        }
    },
}

exports.OTCTrade = damlTypes.assembleTemplate(
    {
        templateId:
            '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTrade',
        templateIdWithPackageId:
            'e5c9847d5a88d3b8d65436f01765fc5ba142cc58529692e2dacdd865d9939f71:Splice.Testing.Apps.TradingApp:OTCTrade',
        keyDecoder: damlTypes.lazyMemo(function () {
            return jtv.constant(undefined)
        }),
        keyEncode: function () {
            throw 'EncodeError'
        },
        decoder: damlTypes.lazyMemo(function () {
            return jtv.object({
                venue: damlTypes.Party.decoder,
                transferLegs: damlTypes.TextMap(
                    pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d
                        .Splice.Api.Token.AllocationV1.TransferLeg
                ).decoder,
                tradeCid: damlTypes.ContractId(exports.OTCTradeProposal)
                    .decoder,
                createdAt: damlTypes.Time.decoder,
                prepareUntil: damlTypes.Time.decoder,
                settleBefore: damlTypes.Time.decoder,
            })
        }),
        encode: function (__typed__) {
            return {
                venue: damlTypes.Party.encode(__typed__.venue),
                transferLegs: damlTypes
                    .TextMap(
                        pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d
                            .Splice.Api.Token.AllocationV1.TransferLeg
                    )
                    .encode(__typed__.transferLegs),
                tradeCid: damlTypes
                    .ContractId(exports.OTCTradeProposal)
                    .encode(__typed__.tradeCid),
                createdAt: damlTypes.Time.encode(__typed__.createdAt),
                prepareUntil: damlTypes.Time.encode(__typed__.prepareUntil),
                settleBefore: damlTypes.Time.encode(__typed__.settleBefore),
            }
        },
        Archive: {
            template: function () {
                return exports.OTCTrade
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
        OTCTrade_Cancel: {
            template: function () {
                return exports.OTCTrade
            },
            choiceName: 'OTCTrade_Cancel',
            argumentDecoder: damlTypes.lazyMemo(function () {
                return exports.OTCTrade_Cancel.decoder
            }),
            argumentEncode: function (__typed__) {
                return exports.OTCTrade_Cancel.encode(__typed__)
            },
            resultDecoder: damlTypes.lazyMemo(function () {
                return damlTypes.TextMap(
                    damlTypes.Optional(
                        pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d
                            .Splice.Api.Token.AllocationV1
                            .Allocation_CancelResult
                    )
                ).decoder
            }),
            resultEncode: function (__typed__) {
                return damlTypes
                    .TextMap(
                        damlTypes.Optional(
                            pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d
                                .Splice.Api.Token.AllocationV1
                                .Allocation_CancelResult
                        )
                    )
                    .encode(__typed__)
            },
        },
        OTCTrade_Settle: {
            template: function () {
                return exports.OTCTrade
            },
            choiceName: 'OTCTrade_Settle',
            argumentDecoder: damlTypes.lazyMemo(function () {
                return exports.OTCTrade_Settle.decoder
            }),
            argumentEncode: function (__typed__) {
                return exports.OTCTrade_Settle.encode(__typed__)
            },
            resultDecoder: damlTypes.lazyMemo(function () {
                return damlTypes.TextMap(
                    pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d
                        .Splice.Api.Token.AllocationV1
                        .Allocation_ExecuteTransferResult
                ).decoder
            }),
            resultEncode: function (__typed__) {
                return damlTypes
                    .TextMap(
                        pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d
                            .Splice.Api.Token.AllocationV1
                            .Allocation_ExecuteTransferResult
                    )
                    .encode(__typed__)
            },
        },
    },

    pkg6fe848530b2404017c4a12874c956ad7d5c8a419ee9b040f96b5c13172d2e193.Splice
        .Api.Token.AllocationRequestV1.AllocationRequest
)

damlTypes.registerTemplate(exports.OTCTrade, [
    'e5c9847d5a88d3b8d65436f01765fc5ba142cc58529692e2dacdd865d9939f71',
    '#splice-token-test-trading-app',
])

exports.OTCTradeProposal_InitiateSettlement = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            prepareUntil: damlTypes.Time.decoder,
            settleBefore: damlTypes.Time.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            prepareUntil: damlTypes.Time.encode(__typed__.prepareUntil),
            settleBefore: damlTypes.Time.encode(__typed__.settleBefore),
        }
    },
}

exports.OTCTradeProposal_Reject = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({ trader: damlTypes.Party.decoder })
    }),
    encode: function (__typed__) {
        return {
            trader: damlTypes.Party.encode(__typed__.trader),
        }
    },
}

exports.OTCTradeProposal_Accept = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({ approver: damlTypes.Party.decoder })
    }),
    encode: function (__typed__) {
        return {
            approver: damlTypes.Party.encode(__typed__.approver),
        }
    },
}

exports.OTCTradeProposal = damlTypes.assembleTemplate({
    templateId:
        '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
    templateIdWithPackageId:
        'e5c9847d5a88d3b8d65436f01765fc5ba142cc58529692e2dacdd865d9939f71:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
    keyDecoder: damlTypes.lazyMemo(function () {
        return jtv.constant(undefined)
    }),
    keyEncode: function () {
        throw 'EncodeError'
    },
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            venue: damlTypes.Party.decoder,
            tradeCid: jtv.Decoder.withDefault(
                null,
                damlTypes.Optional(
                    damlTypes.ContractId(exports.OTCTradeProposal)
                ).decoder
            ),
            transferLegs: damlTypes.TextMap(
                pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d
                    .Splice.Api.Token.AllocationV1.TransferLeg
            ).decoder,
            approvers: damlTypes.List(damlTypes.Party).decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            venue: damlTypes.Party.encode(__typed__.venue),
            tradeCid: damlTypes
                .Optional(damlTypes.ContractId(exports.OTCTradeProposal))
                .encode(__typed__.tradeCid),
            transferLegs: damlTypes
                .TextMap(
                    pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d
                        .Splice.Api.Token.AllocationV1.TransferLeg
                )
                .encode(__typed__.transferLegs),
            approvers: damlTypes
                .List(damlTypes.Party)
                .encode(__typed__.approvers),
        }
    },
    OTCTradeProposal_Accept: {
        template: function () {
            return exports.OTCTradeProposal
        },
        choiceName: 'OTCTradeProposal_Accept',
        argumentDecoder: damlTypes.lazyMemo(function () {
            return exports.OTCTradeProposal_Accept.decoder
        }),
        argumentEncode: function (__typed__) {
            return exports.OTCTradeProposal_Accept.encode(__typed__)
        },
        resultDecoder: damlTypes.lazyMemo(function () {
            return damlTypes.ContractId(exports.OTCTradeProposal).decoder
        }),
        resultEncode: function (__typed__) {
            return damlTypes
                .ContractId(exports.OTCTradeProposal)
                .encode(__typed__)
        },
    },
    OTCTradeProposal_Reject: {
        template: function () {
            return exports.OTCTradeProposal
        },
        choiceName: 'OTCTradeProposal_Reject',
        argumentDecoder: damlTypes.lazyMemo(function () {
            return exports.OTCTradeProposal_Reject.decoder
        }),
        argumentEncode: function (__typed__) {
            return exports.OTCTradeProposal_Reject.encode(__typed__)
        },
        resultDecoder: damlTypes.lazyMemo(function () {
            return damlTypes.Unit.decoder
        }),
        resultEncode: function (__typed__) {
            return damlTypes.Unit.encode(__typed__)
        },
    },
    OTCTradeProposal_InitiateSettlement: {
        template: function () {
            return exports.OTCTradeProposal
        },
        choiceName: 'OTCTradeProposal_InitiateSettlement',
        argumentDecoder: damlTypes.lazyMemo(function () {
            return exports.OTCTradeProposal_InitiateSettlement.decoder
        }),
        argumentEncode: function (__typed__) {
            return exports.OTCTradeProposal_InitiateSettlement.encode(__typed__)
        },
        resultDecoder: damlTypes.lazyMemo(function () {
            return damlTypes.ContractId(exports.OTCTrade).decoder
        }),
        resultEncode: function (__typed__) {
            return damlTypes.ContractId(exports.OTCTrade).encode(__typed__)
        },
    },
    Archive: {
        template: function () {
            return exports.OTCTradeProposal
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
})

damlTypes.registerTemplate(exports.OTCTradeProposal, [
    'e5c9847d5a88d3b8d65436f01765fc5ba142cc58529692e2dacdd865d9939f71',
    '#splice-token-test-trading-app',
])
