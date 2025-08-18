'use strict'

function __export(m) {
    /* eslint-disable-next-line no-prototype-builtins */
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p]
}
Object.defineProperty(exports, '__esModule', { value: true })

var jtv = require('@mojotech/json-type-validation')

var damlTypes = require('@daml/types')

var damlLedger = require('@daml/ledger')

exports.NonEmpty = function (a) {
    return {
        decoder: damlTypes.lazyMemo(function () {
            return jtv.object({ hd: a.decoder, tl: damlTypes.List(a).decoder })
        }),
        encode: function (__typed__) {
            return {
                hd: a.encode(__typed__.hd),
                tl: damlTypes.List(a).encode(__typed__.tl),
            }
        },
    }
}
