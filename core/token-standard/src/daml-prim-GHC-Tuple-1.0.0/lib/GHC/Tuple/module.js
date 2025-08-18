'use strict'

function __export(m) {
    /* eslint-disable-next-line no-prototype-builtins */
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p]
}
Object.defineProperty(exports, '__esModule', { value: true })

var jtv = require('@mojotech/json-type-validation')

var damlTypes = require('@daml/types')

var damlLedger = require('@daml/ledger')

exports.Unit = function (a) {
    return {
        decoder: damlTypes.lazyMemo(function () {
            return jtv.object({ _1: a.decoder })
        }),
        encode: function (__typed__) {
            return {
                _1: a.encode(__typed__._1),
            }
        },
    }
}
