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
var pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d = require('@daml.js/splice-api-token-allocation-v1-1.0.0')
var pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69 = require('@daml.js/ghc-stdlib-DA-Internal-Template-1.0.0')

exports.AllocationRequest = damlTypes.assembleInterface(
    '#splice-api-token-allocation-request-v1:Splice.Api.Token.AllocationRequestV1:AllocationRequest',
    '6fe848530b2404017c4a12874c956ad7d5c8a419ee9b040f96b5c13172d2e193:Splice.Api.Token.AllocationRequestV1:AllocationRequest',
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
                return pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f
                    .Splice.Api.Token.MetadataV1.ChoiceExecutionMetadata.decoder
            }),
            resultEncode: function (__typed__) {
                return pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.ChoiceExecutionMetadata.encode(
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
                return pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f
                    .Splice.Api.Token.MetadataV1.ChoiceExecutionMetadata.decoder
            }),
            resultEncode: function (__typed__) {
                return pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.ChoiceExecutionMetadata.encode(
                    __typed__
                )
            },
        },
    }
)

exports.AllocationRequestView = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            settlement:
                pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d
                    .Splice.Api.Token.AllocationV1.SettlementInfo.decoder,
            transferLegs: damlTypes.TextMap(
                pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d
                    .Splice.Api.Token.AllocationV1.TransferLeg
            ).decoder,
            meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f
                .Splice.Api.Token.MetadataV1.Metadata.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            settlement:
                pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d.Splice.Api.Token.AllocationV1.SettlementInfo.encode(
                    __typed__.settlement
                ),
            transferLegs: damlTypes
                .TextMap(
                    pkg93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d
                        .Splice.Api.Token.AllocationV1.TransferLeg
                )
                .encode(__typed__.transferLegs),
            meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.Metadata.encode(
                __typed__.meta
            ),
        }
    },
}

exports.AllocationRequest_Withdraw = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            extraArgs:
                pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f
                    .Splice.Api.Token.MetadataV1.ExtraArgs.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            extraArgs:
                pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.ExtraArgs.encode(
                    __typed__.extraArgs
                ),
        }
    },
}

exports.AllocationRequest_Reject = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            actor: damlTypes.Party.decoder,
            extraArgs:
                pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f
                    .Splice.Api.Token.MetadataV1.ExtraArgs.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            actor: damlTypes.Party.encode(__typed__.actor),
            extraArgs:
                pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.ExtraArgs.encode(
                    __typed__.extraArgs
                ),
        }
    },
}
