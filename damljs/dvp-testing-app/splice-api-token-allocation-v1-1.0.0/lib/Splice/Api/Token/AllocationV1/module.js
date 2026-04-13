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
var pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b = require('@daml.js/splice-api-token-holding-v1-1.0.0')
var pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69 = require('@daml.js/ghc-stdlib-DA-Internal-Template-1.0.0')

exports.Allocation = damlTypes.assembleInterface(
    '#splice-api-token-allocation-v1:Splice.Api.Token.AllocationV1:Allocation',
    '93c942ae2b4c2ba674fb152fe38473c507bda4e82b4e4c5da55a552a9d8cce1d:Splice.Api.Token.AllocationV1:Allocation',
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
                damlTypes.ContractId(
                    pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b
                        .Splice.Api.Token.HoldingV1.Holding
                )
            ).decoder,
            meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f
                .Splice.Api.Token.MetadataV1.Metadata.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            senderHoldingCids: damlTypes
                .List(
                    damlTypes.ContractId(
                        pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b
                            .Splice.Api.Token.HoldingV1.Holding
                    )
                )
                .encode(__typed__.senderHoldingCids),
            meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.Metadata.encode(
                __typed__.meta
            ),
        }
    },
}

exports.Allocation_CancelResult = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            senderHoldingCids: damlTypes.List(
                damlTypes.ContractId(
                    pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b
                        .Splice.Api.Token.HoldingV1.Holding
                )
            ).decoder,
            meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f
                .Splice.Api.Token.MetadataV1.Metadata.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            senderHoldingCids: damlTypes
                .List(
                    damlTypes.ContractId(
                        pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b
                            .Splice.Api.Token.HoldingV1.Holding
                    )
                )
                .encode(__typed__.senderHoldingCids),
            meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.Metadata.encode(
                __typed__.meta
            ),
        }
    },
}

exports.Allocation_ExecuteTransferResult = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            senderHoldingCids: damlTypes.List(
                damlTypes.ContractId(
                    pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b
                        .Splice.Api.Token.HoldingV1.Holding
                )
            ).decoder,
            receiverHoldingCids: damlTypes.List(
                damlTypes.ContractId(
                    pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b
                        .Splice.Api.Token.HoldingV1.Holding
                )
            ).decoder,
            meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f
                .Splice.Api.Token.MetadataV1.Metadata.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            senderHoldingCids: damlTypes
                .List(
                    damlTypes.ContractId(
                        pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b
                            .Splice.Api.Token.HoldingV1.Holding
                    )
                )
                .encode(__typed__.senderHoldingCids),
            receiverHoldingCids: damlTypes
                .List(
                    damlTypes.ContractId(
                        pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b
                            .Splice.Api.Token.HoldingV1.Holding
                    )
                )
                .encode(__typed__.receiverHoldingCids),
            meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.Metadata.encode(
                __typed__.meta
            ),
        }
    },
}

exports.Allocation_Withdraw = {
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

exports.Allocation_Cancel = {
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

exports.Allocation_ExecuteTransfer = {
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

exports.AllocationView = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            allocation: exports.AllocationSpecification.decoder,
            holdingCids: damlTypes.List(
                damlTypes.ContractId(
                    pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b
                        .Splice.Api.Token.HoldingV1.Holding
                )
            ).decoder,
            meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f
                .Splice.Api.Token.MetadataV1.Metadata.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            allocation: exports.AllocationSpecification.encode(
                __typed__.allocation
            ),
            holdingCids: damlTypes
                .List(
                    damlTypes.ContractId(
                        pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b
                            .Splice.Api.Token.HoldingV1.Holding
                    )
                )
                .encode(__typed__.holdingCids),
            meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.Metadata.encode(
                __typed__.meta
            ),
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
            instrumentId:
                pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b
                    .Splice.Api.Token.HoldingV1.InstrumentId.decoder,
            meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f
                .Splice.Api.Token.MetadataV1.Metadata.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            sender: damlTypes.Party.encode(__typed__.sender),
            receiver: damlTypes.Party.encode(__typed__.receiver),
            amount: damlTypes.Numeric(10).encode(__typed__.amount),
            instrumentId:
                pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b.Splice.Api.Token.HoldingV1.InstrumentId.encode(
                    __typed__.instrumentId
                ),
            meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.Metadata.encode(
                __typed__.meta
            ),
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
            meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f
                .Splice.Api.Token.MetadataV1.Metadata.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            executor: damlTypes.Party.encode(__typed__.executor),
            settlementRef: exports.Reference.encode(__typed__.settlementRef),
            requestedAt: damlTypes.Time.encode(__typed__.requestedAt),
            allocateBefore: damlTypes.Time.encode(__typed__.allocateBefore),
            settleBefore: damlTypes.Time.encode(__typed__.settleBefore),
            meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.Metadata.encode(
                __typed__.meta
            ),
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
                        pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f
                            .Splice.Api.Token.MetadataV1.AnyContract
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
                        pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f
                            .Splice.Api.Token.MetadataV1.AnyContract
                    )
                )
                .encode(__typed__.cid),
        }
    },
}
