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

var pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69 = require('@daml.js/ghc-stdlib-DA-Internal-Template-1.0.0')

exports.FeaturedAppActivityMarker = damlTypes.assembleInterface(
    '#splice-api-featured-app-v1:Splice.Api.FeaturedAppRightV1:FeaturedAppActivityMarker',
    '7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda:Splice.Api.FeaturedAppRightV1:FeaturedAppActivityMarker',
    function () {
        return exports.FeaturedAppActivityMarkerView
    },
    {
        Archive: {
            template: function () {
                return exports.FeaturedAppActivityMarker
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

exports.FeaturedAppRight = damlTypes.assembleInterface(
    '#splice-api-featured-app-v1:Splice.Api.FeaturedAppRightV1:FeaturedAppRight',
    '7804375fe5e4c6d5afe067bd314c42fe0b7d005a1300019c73154dd939da4dda:Splice.Api.FeaturedAppRightV1:FeaturedAppRight',
    function () {
        return exports.FeaturedAppRightView
    },
    {
        Archive: {
            template: function () {
                return exports.FeaturedAppRight
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
        FeaturedAppRight_CreateActivityMarker: {
            template: function () {
                return exports.FeaturedAppRight
            },
            choiceName: 'FeaturedAppRight_CreateActivityMarker',
            argumentDecoder: damlTypes.lazyMemo(function () {
                return exports.FeaturedAppRight_CreateActivityMarker.decoder
            }),
            argumentEncode: function (__typed__) {
                return exports.FeaturedAppRight_CreateActivityMarker.encode(
                    __typed__
                )
            },
            resultDecoder: damlTypes.lazyMemo(function () {
                return exports.FeaturedAppRight_CreateActivityMarkerResult
                    .decoder
            }),
            resultEncode: function (__typed__) {
                return exports.FeaturedAppRight_CreateActivityMarkerResult.encode(
                    __typed__
                )
            },
        },
    }
)

exports.FeaturedAppActivityMarkerView = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            dso: damlTypes.Party.decoder,
            provider: damlTypes.Party.decoder,
            beneficiary: damlTypes.Party.decoder,
            weight: damlTypes.Numeric(10).decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            dso: damlTypes.Party.encode(__typed__.dso),
            provider: damlTypes.Party.encode(__typed__.provider),
            beneficiary: damlTypes.Party.encode(__typed__.beneficiary),
            weight: damlTypes.Numeric(10).encode(__typed__.weight),
        }
    },
}

exports.FeaturedAppRightView = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            dso: damlTypes.Party.decoder,
            provider: damlTypes.Party.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            dso: damlTypes.Party.encode(__typed__.dso),
            provider: damlTypes.Party.encode(__typed__.provider),
        }
    },
}

exports.FeaturedAppRight_CreateActivityMarkerResult = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            activityMarkerCids: damlTypes.List(
                damlTypes.ContractId(exports.FeaturedAppActivityMarker)
            ).decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            activityMarkerCids: damlTypes
                .List(damlTypes.ContractId(exports.FeaturedAppActivityMarker))
                .encode(__typed__.activityMarkerCids),
        }
    },
}

exports.FeaturedAppRight_CreateActivityMarker = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            beneficiaries: damlTypes.List(exports.AppRewardBeneficiary).decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            beneficiaries: damlTypes
                .List(exports.AppRewardBeneficiary)
                .encode(__typed__.beneficiaries),
        }
    },
}

exports.AppRewardBeneficiary = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            beneficiary: damlTypes.Party.decoder,
            weight: damlTypes.Numeric(10).decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            beneficiary: damlTypes.Party.encode(__typed__.beneficiary),
            weight: damlTypes.Numeric(10).encode(__typed__.weight),
        }
    },
}
