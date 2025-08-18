'use strict'

function __export(m) {
    /* eslint-disable-next-line no-prototype-builtins */
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p]
}
Object.defineProperty(exports, '__esModule', { value: true })

var jtv = require('@mojotech/json-type-validation')

var damlTypes = require('@daml/types')

var damlLedger = require('@daml/ledger')

exports.Set = function (k) {
    return {
        decoder: damlTypes.lazyMemo(function () {
            return jtv.object({ map: damlTypes.Map(k, damlTypes.Unit).decoder })
        }),
        encode: function (__typed__) {
            return {
                map: damlTypes.Map(k, damlTypes.Unit).encode(__typed__.map),
            }
        },
    }
}
