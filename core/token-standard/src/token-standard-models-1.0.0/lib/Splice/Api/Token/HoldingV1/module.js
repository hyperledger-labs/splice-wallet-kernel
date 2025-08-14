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
var pkgb70db8369e1c461d5c70f1c86f526a29e9776c655e6ffc2560f95b05ccb8b946 = require('@daml.js/daml-stdlib-DA-Time-Types-1.0.0')

var Splice_Api_Token_MetadataV1 = require('../../../../Splice/Api/Token/MetadataV1/module')

exports.Holding = damlTypes.assembleInterface(
    '2e5bc93346f9c9e0bd2f4d64f966c0fac2089d101f3091ce26623bd417fd4075:Splice.Api.Token.HoldingV1:Holding',
    function () {
        return exports.HoldingView
    },
    {
        Archive: {
            template: function () {
                return exports.Holding
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
    }
)

exports.HoldingView = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            owner: damlTypes.Party.decoder,
            instrumentId: exports.InstrumentId.decoder,
            amount: damlTypes.Numeric(10).decoder,
            lock: jtv.Decoder.withDefault(
                null,
                damlTypes.Optional(exports.Lock).decoder
            ),
            meta: Splice_Api_Token_MetadataV1.Metadata.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            owner: damlTypes.Party.encode(__typed__.owner),
            instrumentId: exports.InstrumentId.encode(__typed__.instrumentId),
            amount: damlTypes.Numeric(10).encode(__typed__.amount),
            lock: damlTypes.Optional(exports.Lock).encode(__typed__.lock),
            meta: Splice_Api_Token_MetadataV1.Metadata.encode(__typed__.meta),
        }
    },
}

exports.Lock = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            holders: damlTypes.List(damlTypes.Party).decoder,
            expiresAt: jtv.Decoder.withDefault(
                null,
                damlTypes.Optional(damlTypes.Time).decoder
            ),
            expiresAfter: jtv.Decoder.withDefault(
                null,
                damlTypes.Optional(
                    pkgb70db8369e1c461d5c70f1c86f526a29e9776c655e6ffc2560f95b05ccb8b946
                        .DA.Time.Types.RelTime
                ).decoder
            ),
            context: jtv.Decoder.withDefault(
                null,
                damlTypes.Optional(damlTypes.Text).decoder
            ),
        })
    }),
    encode: function (__typed__) {
        return {
            holders: damlTypes.List(damlTypes.Party).encode(__typed__.holders),
            expiresAt: damlTypes
                .Optional(damlTypes.Time)
                .encode(__typed__.expiresAt),
            expiresAfter: damlTypes
                .Optional(
                    pkgb70db8369e1c461d5c70f1c86f526a29e9776c655e6ffc2560f95b05ccb8b946
                        .DA.Time.Types.RelTime
                )
                .encode(__typed__.expiresAfter),
            context: damlTypes
                .Optional(damlTypes.Text)
                .encode(__typed__.context),
        }
    },
}

exports.InstrumentId = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            admin: damlTypes.Party.decoder,
            id: damlTypes.Text.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            admin: damlTypes.Party.encode(__typed__.admin),
            id: damlTypes.Text.encode(__typed__.id),
        }
    },
}
