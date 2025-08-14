'use strict'

function __export(m) {
    /* eslint-disable-next-line no-prototype-builtins */
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p]
}
Object.defineProperty(exports, '__esModule', { value: true })

var jtv = require('@mojotech/json-type-validation')

var damlTypes = require('@daml/types')

var damlLedger = require('@daml/ledger')

exports.All = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({ getAll: damlTypes.Bool.decoder })
    }),
    encode: function (__typed__) {
        return {
            getAll: damlTypes.Bool.encode(__typed__.getAll),
        }
    },
}

exports.Any = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({ getAny: damlTypes.Bool.decoder })
    }),
    encode: function (__typed__) {
        return {
            getAny: damlTypes.Bool.encode(__typed__.getAny),
        }
    },
}

exports.Sum = function (a) {
    return {
        decoder: damlTypes.lazyMemo(function () {
            return jtv.object({ unpack: a.decoder })
        }),
        encode: function (__typed__) {
            return {
                unpack: a.encode(__typed__.unpack),
            }
        },
    }
}

exports.Product = function (a) {
    return {
        decoder: damlTypes.lazyMemo(function () {
            return jtv.object({ unpack: a.decoder })
        }),
        encode: function (__typed__) {
            return {
                unpack: a.encode(__typed__.unpack),
            }
        },
    }
}
