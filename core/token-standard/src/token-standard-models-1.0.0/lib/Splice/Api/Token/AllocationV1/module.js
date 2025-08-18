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

var Splice_Api_Token_HoldingV1 = require('../../../../Splice/Api/Token/HoldingV1/module')
var Splice_Api_Token_MetadataV1 = require('../../../../Splice/Api/Token/MetadataV1/module')

exports.Allocation = damlTypes.assembleInterface(
    '2e5bc93346f9c9e0bd2f4d64f966c0fac2089d101f3091ce26623bd417fd4075:Splice.Api.Token.AllocationV1:Allocation',
    function () {
        return exports.AllocationView
    },
    {
        Archive: {
            template: function () {
                return exports.Allocation
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
        Allocation_Withdraw: {
            template: function () {
                return exports.Allocation
            },
            choiceName: 'Allocation_Withdraw',
            argumentDecoder: damlTypes.lazyMemo(function () {
                return exports.Allocation_Withdraw.decoder
            }),
            argumentEncode: function (__typed__) {
                return exports.Allocation_Withdraw.encode(__typed__)
            },
            resultDecoder: damlTypes.lazyMemo(function () {
                return exports.Allocation_WithdrawResult.decoder
            }),
            resultEncode: function (__typed__) {
                return exports.Allocation_WithdrawResult.encode(__typed__)
            },
        },
        Allocation_Cancel: {
            template: function () {
                return exports.Allocation
            },
            choiceName: 'Allocation_Cancel',
            argumentDecoder: damlTypes.lazyMemo(function () {
                return exports.Allocation_Cancel.decoder
            }),
            argumentEncode: function (__typed__) {
                return exports.Allocation_Cancel.encode(__typed__)
            },
            resultDecoder: damlTypes.lazyMemo(function () {
                return exports.Allocation_CancelResult.decoder
            }),
            resultEncode: function (__typed__) {
                return exports.Allocation_CancelResult.encode(__typed__)
            },
        },
        Allocation_ExecuteTransfer: {
            template: function () {
                return exports.Allocation
            },
            choiceName: 'Allocation_ExecuteTransfer',
            argumentDecoder: damlTypes.lazyMemo(function () {
                return exports.Allocation_ExecuteTransfer.decoder
            }),
            argumentEncode: function (__typed__) {
                return exports.Allocation_ExecuteTransfer.encode(__typed__)
            },
            resultDecoder: damlTypes.lazyMemo(function () {
                return exports.Allocation_ExecuteTransferResult.decoder
            }),
            resultEncode: function (__typed__) {
                return exports.Allocation_ExecuteTransferResult.encode(
                    __typed__
                )
            },
        },
    }
)

exports.Allocation_WithdrawResult = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            senderHoldingCids: damlTypes.List(
                damlTypes.ContractId(Splice_Api_Token_HoldingV1.Holding)
            ).decoder,
            meta: Splice_Api_Token_MetadataV1.Metadata.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            senderHoldingCids: damlTypes
                .List(damlTypes.ContractId(Splice_Api_Token_HoldingV1.Holding))
                .encode(__typed__.senderHoldingCids),
            meta: Splice_Api_Token_MetadataV1.Metadata.encode(__typed__.meta),
        }
    },
}

exports.Allocation_CancelResult = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            senderHoldingCids: damlTypes.List(
                damlTypes.ContractId(Splice_Api_Token_HoldingV1.Holding)
            ).decoder,
            meta: Splice_Api_Token_MetadataV1.Metadata.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            senderHoldingCids: damlTypes
                .List(damlTypes.ContractId(Splice_Api_Token_HoldingV1.Holding))
                .encode(__typed__.senderHoldingCids),
            meta: Splice_Api_Token_MetadataV1.Metadata.encode(__typed__.meta),
        }
    },
}

exports.Allocation_ExecuteTransferResult = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            senderHoldingCids: damlTypes.List(
                damlTypes.ContractId(Splice_Api_Token_HoldingV1.Holding)
            ).decoder,
            receiverHoldingCids: damlTypes.List(
                damlTypes.ContractId(Splice_Api_Token_HoldingV1.Holding)
            ).decoder,
            meta: Splice_Api_Token_MetadataV1.Metadata.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            senderHoldingCids: damlTypes
                .List(damlTypes.ContractId(Splice_Api_Token_HoldingV1.Holding))
                .encode(__typed__.senderHoldingCids),
            receiverHoldingCids: damlTypes
                .List(damlTypes.ContractId(Splice_Api_Token_HoldingV1.Holding))
                .encode(__typed__.receiverHoldingCids),
            meta: Splice_Api_Token_MetadataV1.Metadata.encode(__typed__.meta),
        }
    },
}

exports.Allocation_Withdraw = {
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

exports.Allocation_Cancel = {
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

exports.Allocation_ExecuteTransfer = {
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

exports.AllocationView = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            allocation: exports.AllocationSpecification.decoder,
            holdingCids: damlTypes.List(
                damlTypes.ContractId(Splice_Api_Token_HoldingV1.Holding)
            ).decoder,
            meta: Splice_Api_Token_MetadataV1.Metadata.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            allocation: exports.AllocationSpecification.encode(
                __typed__.allocation
            ),
            holdingCids: damlTypes
                .List(damlTypes.ContractId(Splice_Api_Token_HoldingV1.Holding))
                .encode(__typed__.holdingCids),
            meta: Splice_Api_Token_MetadataV1.Metadata.encode(__typed__.meta),
        }
    },
}

exports.AllocationSpecification = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            settlement: exports.SettlementInfo.decoder,
            transferLegId: damlTypes.Text.decoder,
            transferLeg: exports.TransferLeg.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            settlement: exports.SettlementInfo.encode(__typed__.settlement),
            transferLegId: damlTypes.Text.encode(__typed__.transferLegId),
            transferLeg: exports.TransferLeg.encode(__typed__.transferLeg),
        }
    },
}

exports.TransferLeg = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            sender: damlTypes.Party.decoder,
            receiver: damlTypes.Party.decoder,
            amount: damlTypes.Numeric(10).decoder,
            instrumentId: Splice_Api_Token_HoldingV1.InstrumentId.decoder,
            meta: Splice_Api_Token_MetadataV1.Metadata.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            sender: damlTypes.Party.encode(__typed__.sender),
            receiver: damlTypes.Party.encode(__typed__.receiver),
            amount: damlTypes.Numeric(10).encode(__typed__.amount),
            instrumentId: Splice_Api_Token_HoldingV1.InstrumentId.encode(
                __typed__.instrumentId
            ),
            meta: Splice_Api_Token_MetadataV1.Metadata.encode(__typed__.meta),
        }
    },
}

exports.SettlementInfo = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            executor: damlTypes.Party.decoder,
            settlementRef: exports.Reference.decoder,
            requestedAt: damlTypes.Time.decoder,
            allocateBefore: damlTypes.Time.decoder,
            settleBefore: damlTypes.Time.decoder,
            meta: Splice_Api_Token_MetadataV1.Metadata.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            executor: damlTypes.Party.encode(__typed__.executor),
            settlementRef: exports.Reference.encode(__typed__.settlementRef),
            requestedAt: damlTypes.Time.encode(__typed__.requestedAt),
            allocateBefore: damlTypes.Time.encode(__typed__.allocateBefore),
            settleBefore: damlTypes.Time.encode(__typed__.settleBefore),
            meta: Splice_Api_Token_MetadataV1.Metadata.encode(__typed__.meta),
        }
    },
}

exports.Reference = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            id: damlTypes.Text.decoder,
            cid: jtv.Decoder.withDefault(
                null,
                damlTypes.Optional(
                    damlTypes.ContractId(
                        Splice_Api_Token_MetadataV1.AnyContract
                    )
                ).decoder
            ),
        })
    }),
    encode: function (__typed__) {
        return {
            id: damlTypes.Text.encode(__typed__.id),
            cid: damlTypes
                .Optional(
                    damlTypes.ContractId(
                        Splice_Api_Token_MetadataV1.AnyContract
                    )
                )
                .encode(__typed__.cid),
        }
    },
}
