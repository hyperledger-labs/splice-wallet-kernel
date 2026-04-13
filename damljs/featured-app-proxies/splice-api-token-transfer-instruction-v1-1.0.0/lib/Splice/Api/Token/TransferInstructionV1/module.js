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

exports.TransferFactory = damlTypes.assembleInterface(
    '#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferFactory',
    '55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281:Splice.Api.Token.TransferInstructionV1:TransferFactory',
    function () {
        return exports.TransferFactoryView
    },
    {
        Archive: {
            template: function () {
                return exports.TransferFactory
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
        TransferFactory_Transfer: {
            template: function () {
                return exports.TransferFactory
            },
            choiceName: 'TransferFactory_Transfer',
            argumentDecoder: damlTypes.lazyMemo(function () {
                return exports.TransferFactory_Transfer.decoder
            }),
            argumentEncode: function (__typed__) {
                return exports.TransferFactory_Transfer.encode(__typed__)
            },
            resultDecoder: damlTypes.lazyMemo(function () {
                return exports.TransferInstructionResult.decoder
            }),
            resultEncode: function (__typed__) {
                return exports.TransferInstructionResult.encode(__typed__)
            },
        },
        TransferFactory_PublicFetch: {
            template: function () {
                return exports.TransferFactory
            },
            choiceName: 'TransferFactory_PublicFetch',
            argumentDecoder: damlTypes.lazyMemo(function () {
                return exports.TransferFactory_PublicFetch.decoder
            }),
            argumentEncode: function (__typed__) {
                return exports.TransferFactory_PublicFetch.encode(__typed__)
            },
            resultDecoder: damlTypes.lazyMemo(function () {
                return exports.TransferFactoryView.decoder
            }),
            resultEncode: function (__typed__) {
                return exports.TransferFactoryView.encode(__typed__)
            },
        },
    }
)

exports.TransferInstruction = damlTypes.assembleInterface(
    '#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferInstruction',
    '55ba4deb0ad4662c4168b39859738a0e91388d252286480c7331b3f71a517281:Splice.Api.Token.TransferInstructionV1:TransferInstruction',
    function () {
        return exports.TransferInstructionView
    },
    {
        Archive: {
            template: function () {
                return exports.TransferInstruction
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
        TransferInstruction_Accept: {
            template: function () {
                return exports.TransferInstruction
            },
            choiceName: 'TransferInstruction_Accept',
            argumentDecoder: damlTypes.lazyMemo(function () {
                return exports.TransferInstruction_Accept.decoder
            }),
            argumentEncode: function (__typed__) {
                return exports.TransferInstruction_Accept.encode(__typed__)
            },
            resultDecoder: damlTypes.lazyMemo(function () {
                return exports.TransferInstructionResult.decoder
            }),
            resultEncode: function (__typed__) {
                return exports.TransferInstructionResult.encode(__typed__)
            },
        },
        TransferInstruction_Reject: {
            template: function () {
                return exports.TransferInstruction
            },
            choiceName: 'TransferInstruction_Reject',
            argumentDecoder: damlTypes.lazyMemo(function () {
                return exports.TransferInstruction_Reject.decoder
            }),
            argumentEncode: function (__typed__) {
                return exports.TransferInstruction_Reject.encode(__typed__)
            },
            resultDecoder: damlTypes.lazyMemo(function () {
                return exports.TransferInstructionResult.decoder
            }),
            resultEncode: function (__typed__) {
                return exports.TransferInstructionResult.encode(__typed__)
            },
        },
        TransferInstruction_Withdraw: {
            template: function () {
                return exports.TransferInstruction
            },
            choiceName: 'TransferInstruction_Withdraw',
            argumentDecoder: damlTypes.lazyMemo(function () {
                return exports.TransferInstruction_Withdraw.decoder
            }),
            argumentEncode: function (__typed__) {
                return exports.TransferInstruction_Withdraw.encode(__typed__)
            },
            resultDecoder: damlTypes.lazyMemo(function () {
                return exports.TransferInstructionResult.decoder
            }),
            resultEncode: function (__typed__) {
                return exports.TransferInstructionResult.encode(__typed__)
            },
        },
        TransferInstruction_Update: {
            template: function () {
                return exports.TransferInstruction
            },
            choiceName: 'TransferInstruction_Update',
            argumentDecoder: damlTypes.lazyMemo(function () {
                return exports.TransferInstruction_Update.decoder
            }),
            argumentEncode: function (__typed__) {
                return exports.TransferInstruction_Update.encode(__typed__)
            },
            resultDecoder: damlTypes.lazyMemo(function () {
                return exports.TransferInstructionResult.decoder
            }),
            resultEncode: function (__typed__) {
                return exports.TransferInstructionResult.encode(__typed__)
            },
        },
    }
)

exports.TransferFactoryView = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            admin: damlTypes.Party.decoder,
            meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f
                .Splice.Api.Token.MetadataV1.Metadata.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            admin: damlTypes.Party.encode(__typed__.admin),
            meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.Metadata.encode(
                __typed__.meta
            ),
        }
    },
}

exports.TransferFactory_PublicFetch = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            expectedAdmin: damlTypes.Party.decoder,
            actor: damlTypes.Party.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            expectedAdmin: damlTypes.Party.encode(__typed__.expectedAdmin),
            actor: damlTypes.Party.encode(__typed__.actor),
        }
    },
}

exports.TransferFactory_Transfer = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            expectedAdmin: damlTypes.Party.decoder,
            transfer: exports.Transfer.decoder,
            extraArgs:
                pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f
                    .Splice.Api.Token.MetadataV1.ExtraArgs.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            expectedAdmin: damlTypes.Party.encode(__typed__.expectedAdmin),
            transfer: exports.Transfer.encode(__typed__.transfer),
            extraArgs:
                pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.ExtraArgs.encode(
                    __typed__.extraArgs
                ),
        }
    },
}

exports.TransferInstruction_Update = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            extraActors: damlTypes.List(damlTypes.Party).decoder,
            extraArgs:
                pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f
                    .Splice.Api.Token.MetadataV1.ExtraArgs.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            extraActors: damlTypes
                .List(damlTypes.Party)
                .encode(__typed__.extraActors),
            extraArgs:
                pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.ExtraArgs.encode(
                    __typed__.extraArgs
                ),
        }
    },
}

exports.TransferInstruction_Withdraw = {
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

exports.TransferInstruction_Reject = {
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

exports.TransferInstruction_Accept = {
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

exports.TransferInstructionView = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            originalInstructionCid: jtv.Decoder.withDefault(
                null,
                damlTypes.Optional(
                    damlTypes.ContractId(exports.TransferInstruction)
                ).decoder
            ),
            transfer: exports.Transfer.decoder,
            status: exports.TransferInstructionStatus.decoder,
            meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f
                .Splice.Api.Token.MetadataV1.Metadata.decoder,
        })
    }),
    encode: function (__typed__) {
        return {
            originalInstructionCid: damlTypes
                .Optional(damlTypes.ContractId(exports.TransferInstruction))
                .encode(__typed__.originalInstructionCid),
            transfer: exports.Transfer.encode(__typed__.transfer),
            status: exports.TransferInstructionStatus.encode(__typed__.status),
            meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.Metadata.encode(
                __typed__.meta
            ),
        }
    },
}

exports.TransferInstructionStatus = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.oneOf(
            jtv.object({
                tag: jtv.constant('TransferPendingReceiverAcceptance'),
                value: damlTypes.Unit.decoder,
            }),
            jtv.object({
                tag: jtv.constant('TransferPendingInternalWorkflow'),
                value: exports.TransferInstructionStatus
                    .TransferPendingInternalWorkflow.decoder,
            })
        )
    }),
    encode: function (__typed__) {
        switch (__typed__.tag) {
            case 'TransferPendingReceiverAcceptance':
                return {
                    tag: __typed__.tag,
                    value: damlTypes.Unit.encode(__typed__.value),
                }
            case 'TransferPendingInternalWorkflow':
                return {
                    tag: __typed__.tag,
                    value: exports.TransferInstructionStatus.TransferPendingInternalWorkflow.encode(
                        __typed__.value
                    ),
                }
            default:
                throw (
                    'unrecognized type tag: ' +
                    __typed__.tag +
                    ' while serializing a value of type TransferInstructionStatus'
                )
        }
    },
    TransferPendingInternalWorkflow: {
        decoder: damlTypes.lazyMemo(function () {
            return jtv.object({
                pendingActions: damlTypes.Map(damlTypes.Party, damlTypes.Text)
                    .decoder,
            })
        }),
        encode: function (__typed__) {
            return {
                pendingActions: damlTypes
                    .Map(damlTypes.Party, damlTypes.Text)
                    .encode(__typed__.pendingActions),
            }
        },
    },
}

exports.TransferInstructionResult_Output = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.oneOf(
            jtv.object({
                tag: jtv.constant('TransferInstructionResult_Pending'),
                value: exports.TransferInstructionResult_Output
                    .TransferInstructionResult_Pending.decoder,
            }),
            jtv.object({
                tag: jtv.constant('TransferInstructionResult_Completed'),
                value: exports.TransferInstructionResult_Output
                    .TransferInstructionResult_Completed.decoder,
            }),
            jtv.object({
                tag: jtv.constant('TransferInstructionResult_Failed'),
                value: damlTypes.Unit.decoder,
            })
        )
    }),
    encode: function (__typed__) {
        switch (__typed__.tag) {
            case 'TransferInstructionResult_Pending':
                return {
                    tag: __typed__.tag,
                    value: exports.TransferInstructionResult_Output.TransferInstructionResult_Pending.encode(
                        __typed__.value
                    ),
                }
            case 'TransferInstructionResult_Completed':
                return {
                    tag: __typed__.tag,
                    value: exports.TransferInstructionResult_Output.TransferInstructionResult_Completed.encode(
                        __typed__.value
                    ),
                }
            case 'TransferInstructionResult_Failed':
                return {
                    tag: __typed__.tag,
                    value: damlTypes.Unit.encode(__typed__.value),
                }
            default:
                throw (
                    'unrecognized type tag: ' +
                    __typed__.tag +
                    ' while serializing a value of type TransferInstructionResult_Output'
                )
        }
    },
    TransferInstructionResult_Pending: {
        decoder: damlTypes.lazyMemo(function () {
            return jtv.object({
                transferInstructionCid: damlTypes.ContractId(
                    exports.TransferInstruction
                ).decoder,
            })
        }),
        encode: function (__typed__) {
            return {
                transferInstructionCid: damlTypes
                    .ContractId(exports.TransferInstruction)
                    .encode(__typed__.transferInstructionCid),
            }
        },
    },
    TransferInstructionResult_Completed: {
        decoder: damlTypes.lazyMemo(function () {
            return jtv.object({
                receiverHoldingCids: damlTypes.List(
                    damlTypes.ContractId(
                        pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b
                            .Splice.Api.Token.HoldingV1.Holding
                    )
                ).decoder,
            })
        }),
        encode: function (__typed__) {
            return {
                receiverHoldingCids: damlTypes
                    .List(
                        damlTypes.ContractId(
                            pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b
                                .Splice.Api.Token.HoldingV1.Holding
                        )
                    )
                    .encode(__typed__.receiverHoldingCids),
            }
        },
    },
}

exports.TransferInstructionResult = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            output: exports.TransferInstructionResult_Output.decoder,
            senderChangeCids: damlTypes.List(
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
            output: exports.TransferInstructionResult_Output.encode(
                __typed__.output
            ),
            senderChangeCids: damlTypes
                .List(
                    damlTypes.ContractId(
                        pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b
                            .Splice.Api.Token.HoldingV1.Holding
                    )
                )
                .encode(__typed__.senderChangeCids),
            meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.Metadata.encode(
                __typed__.meta
            ),
        }
    },
}

exports.Transfer = {
    decoder: damlTypes.lazyMemo(function () {
        return jtv.object({
            sender: damlTypes.Party.decoder,
            receiver: damlTypes.Party.decoder,
            amount: damlTypes.Numeric(10).decoder,
            instrumentId:
                pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b
                    .Splice.Api.Token.HoldingV1.InstrumentId.decoder,
            requestedAt: damlTypes.Time.decoder,
            executeBefore: damlTypes.Time.decoder,
            inputHoldingCids: damlTypes.List(
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
            sender: damlTypes.Party.encode(__typed__.sender),
            receiver: damlTypes.Party.encode(__typed__.receiver),
            amount: damlTypes.Numeric(10).encode(__typed__.amount),
            instrumentId:
                pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b.Splice.Api.Token.HoldingV1.InstrumentId.encode(
                    __typed__.instrumentId
                ),
            requestedAt: damlTypes.Time.encode(__typed__.requestedAt),
            executeBefore: damlTypes.Time.encode(__typed__.executeBefore),
            inputHoldingCids: damlTypes
                .List(
                    damlTypes.ContractId(
                        pkg718a0f77e505a8de22f188bd4c87fe74101274e9d4cb1bfac7d09aec7158d35b
                            .Splice.Api.Token.HoldingV1.Holding
                    )
                )
                .encode(__typed__.inputHoldingCids),
            meta: pkg4ded6b668cb3b64f7a88a30874cd41c75829f5e064b3fbbadf41ec7e8363354f.Splice.Api.Token.MetadataV1.Metadata.encode(
                __typed__.meta
            ),
        }
    },
}
