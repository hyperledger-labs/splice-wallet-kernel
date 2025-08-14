'use strict'

function __export(m) {
    /* eslint-disable-next-line no-prototype-builtins */
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p]
}
Object.defineProperty(exports, '__esModule', { value: true })

var jtv = require('@mojotech/json-type-validation')

var damlTypes = require('@daml/types')

var damlLedger = require('@daml/ledger')

exports.SrcLoc = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            srcLocPackage: damlTypes.Text.decoder,
            srcLocModule: damlTypes.Text.decoder,
            srcLocFile: damlTypes.Text.decoder,
            srcLocStartLine: damlTypes.Int.decoder,
            srcLocStartCol: damlTypes.Int.decoder,
            srcLocEndLine: damlTypes.Int.decoder,
            srcLocEndCol: damlTypes.Int.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            srcLocPackage: damlTypes.Text.encode(__typed__.srcLocPackage),
            srcLocModule: damlTypes.Text.encode(__typed__.srcLocModule),
            srcLocFile: damlTypes.Text.encode(__typed__.srcLocFile),
            srcLocStartLine: damlTypes.Int.encode(__typed__.srcLocStartLine),
            srcLocStartCol: damlTypes.Int.encode(__typed__.srcLocStartCol),
            srcLocEndLine: damlTypes.Int.encode(__typed__.srcLocEndLine),
            srcLocEndCol: damlTypes.Int.encode(__typed__.srcLocEndCol),
        }
    },
}
