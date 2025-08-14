'use strict'

function __export(m) {
    /* eslint-disable-next-line no-prototype-builtins */
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p]
}
Object.defineProperty(exports, '__esModule', { value: true })

var jtv = require('@mojotech/json-type-validation')

var damlTypes = require('@daml/types')

var damlLedger = require('@daml/ledger')

var pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69 = require('@daml.js/ghc-stdlib-DA-Internal-Template-1.0.0')

var Splice_Api_Token_AllocationV1 = require('../../../../Splice/Api/Token/AllocationV1/module')
var Splice_Api_Token_MetadataV1 = require('../../../../Splice/Api/Token/MetadataV1/module')

exports.AllocationRequest = damlTypes.assembleInterface(
    '2e5bc93346f9c9e0bd2f4d64f966c0fac2089d101f3091ce26623bd417fd4075:Splice.Api.Token.AllocationRequestV1:AllocationRequest',
    function () {
        return exports.AllocationRequestView
    },
    {
        Archive: {
            template: function () {
                return exports.AllocationRequest
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
        AllocationRequest_Reject: {
            template: function () {
                return exports.AllocationRequest
            },
            choiceName: 'AllocationRequest_Reject',
            argumentDecoder: damlTypes.lazyMemo(function () {
                return exports.AllocationRequest_Reject.decoder
            }),
            argumentEncode: function (__typed__) {
                return exports.AllocationRequest_Reject.encode(__typed__)
            },
            resultDecoder: damlTypes.lazyMemo(function () {
                return Splice_Api_Token_MetadataV1.ChoiceExecutionMetadata
                    .decoder
            }),
            resultEncode: function (__typed__) {
                return Splice_Api_Token_MetadataV1.ChoiceExecutionMetadata.encode(
                    __typed__
                )
            },
        },
        AllocationRequest_Withdraw: {
            template: function () {
                return exports.AllocationRequest
            },
            choiceName: 'AllocationRequest_Withdraw',
            argumentDecoder: damlTypes.lazyMemo(function () {
                return exports.AllocationRequest_Withdraw.decoder
            }),
            argumentEncode: function (__typed__) {
                return exports.AllocationRequest_Withdraw.encode(__typed__)
            },
            resultDecoder: damlTypes.lazyMemo(function () {
                return Splice_Api_Token_MetadataV1.ChoiceExecutionMetadata
                    .decoder
            }),
            resultEncode: function (__typed__) {
                return Splice_Api_Token_MetadataV1.ChoiceExecutionMetadata.encode(
                    __typed__
                )
            },
        },
    }
)

exports.AllocationRequestView = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            settlement: Splice_Api_Token_AllocationV1.SettlementInfo.decoder,
            transferLegs: damlTypes.TextMap(
                Splice_Api_Token_AllocationV1.TransferLeg
            ).decoder,
            meta: Splice_Api_Token_MetadataV1.Metadata.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            settlement: Splice_Api_Token_AllocationV1.SettlementInfo.encode(
                __typed__.settlement
            ),
            transferLegs: damlTypes
                .TextMap(Splice_Api_Token_AllocationV1.TransferLeg)
                .encode(__typed__.transferLegs),
            meta: Splice_Api_Token_MetadataV1.Metadata.encode(__typed__.meta),
        }
    },
}

exports.AllocationRequest_Withdraw = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            extraArgs: Splice_Api_Token_MetadataV1.ExtraArgs.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            extraArgs: Splice_Api_Token_MetadataV1.ExtraArgs.encode(
                __typed__.extraArgs
            ),
        }
    },
}

exports.AllocationRequest_Reject = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            actor: damlTypes.Party.decoder,
            extraArgs: Splice_Api_Token_MetadataV1.ExtraArgs.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            actor: damlTypes.Party.encode(__typed__.actor),
            extraArgs: Splice_Api_Token_MetadataV1.ExtraArgs.encode(
                __typed__.extraArgs
            ),
        }
    },
}
