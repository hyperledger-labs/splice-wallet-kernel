'use strict'

function __export(m) {
    /* eslint-disable-next-line no-prototype-builtins */
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p]
}
Object.defineProperty(exports, '__esModule', { value: true })

var jtv = require('@mojotech/json-type-validation')

var damlTypes = require('@daml/types')

var damlLedger = require('@daml/ledger')

exports.Minstd = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.oneOf(
            jtv.object({
                tag: jtv.constant('Minstd'),
                value: damlTypes.Int.decoder,
            })
        )
    }),
    encode: function (__typed__) {
        switch (__typed__.tag) {
            case 'Minstd':
                return {
                    tag: __typed__.tag,
                    value: damlTypes.Int.encode(__typed__.value),
                }
            default:
                throw (
                    'unrecognized type tag: ' +
                    __typed__.tag +
                    ' while serializing a value of type Minstd'
                )
        }
    },
}
