// Generated from Splice/Api/Token/TransferInstructionV1.daml
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-use-before-define */
import * as jtv from '@mojotech/json-type-validation'
import * as damlTypes from '@daml/types'
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import * as damlLedger from '@daml/ledger'

import * as pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69 from '@daml.js/ghc-stdlib-DA-Internal-Template-1.0.0'

import * as Splice_Api_Token_HoldingV1 from '../../../../Splice/Api/Token/HoldingV1/module'
import * as Splice_Api_Token_MetadataV1 from '../../../../Splice/Api/Token/MetadataV1/module'

export declare type TransferFactory =
    damlTypes.Interface<'a132be8b23c8515da6c828dd97519a73d9c8b1aa6f9cddd3c7acc206e4b41f8c:Splice.Api.Token.TransferInstructionV1:TransferFactory'> &
        TransferFactoryView
export declare interface TransferFactoryInterface {
    Archive: damlTypes.Choice<
        TransferFactory,
        pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive,
        {},
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<TransferFactory, undefined>
        >
    TransferFactory_Transfer: damlTypes.Choice<
        TransferFactory,
        TransferFactory_Transfer,
        TransferInstructionResult,
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<TransferFactory, undefined>
        >
    TransferFactory_PublicFetch: damlTypes.Choice<
        TransferFactory,
        TransferFactory_PublicFetch,
        TransferFactoryView,
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<TransferFactory, undefined>
        >
}
export declare const TransferFactory: damlTypes.InterfaceCompanion<
    TransferFactory,
    undefined,
    'a132be8b23c8515da6c828dd97519a73d9c8b1aa6f9cddd3c7acc206e4b41f8c:Splice.Api.Token.TransferInstructionV1:TransferFactory'
> &
    damlTypes.FromTemplate<TransferFactory, unknown> &
    TransferFactoryInterface

export declare type TransferInstruction =
    damlTypes.Interface<'a132be8b23c8515da6c828dd97519a73d9c8b1aa6f9cddd3c7acc206e4b41f8c:Splice.Api.Token.TransferInstructionV1:TransferInstruction'> &
        TransferInstructionView
export declare interface TransferInstructionInterface {
    Archive: damlTypes.Choice<
        TransferInstruction,
        pkg9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69.DA.Internal.Template.Archive,
        {},
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<TransferInstruction, undefined>
        >
    TransferInstruction_Accept: damlTypes.Choice<
        TransferInstruction,
        TransferInstruction_Accept,
        TransferInstructionResult,
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<TransferInstruction, undefined>
        >
    TransferInstruction_Reject: damlTypes.Choice<
        TransferInstruction,
        TransferInstruction_Reject,
        TransferInstructionResult,
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<TransferInstruction, undefined>
        >
    TransferInstruction_Withdraw: damlTypes.Choice<
        TransferInstruction,
        TransferInstruction_Withdraw,
        TransferInstructionResult,
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<TransferInstruction, undefined>
        >
    TransferInstruction_Update: damlTypes.Choice<
        TransferInstruction,
        TransferInstruction_Update,
        TransferInstructionResult,
        undefined
    > &
        damlTypes.ChoiceFrom<
            damlTypes.InterfaceCompanion<TransferInstruction, undefined>
        >
}
export declare const TransferInstruction: damlTypes.InterfaceCompanion<
    TransferInstruction,
    undefined,
    'a132be8b23c8515da6c828dd97519a73d9c8b1aa6f9cddd3c7acc206e4b41f8c:Splice.Api.Token.TransferInstructionV1:TransferInstruction'
> &
    damlTypes.FromTemplate<TransferInstruction, unknown> &
    TransferInstructionInterface

export declare type TransferFactoryView = {
    admin: damlTypes.Party
    meta: Splice_Api_Token_MetadataV1.Metadata
}

export declare const TransferFactoryView: damlTypes.Serializable<TransferFactoryView> & {}

export declare type TransferFactory_PublicFetch = {
    expectedAdmin: damlTypes.Party
    actor: damlTypes.Party
}

export declare const TransferFactory_PublicFetch: damlTypes.Serializable<TransferFactory_PublicFetch> & {}

export declare type TransferFactory_Transfer = {
    expectedAdmin: damlTypes.Party
    transfer: Transfer
    extraArgs: Splice_Api_Token_MetadataV1.ExtraArgs
}

export declare const TransferFactory_Transfer: damlTypes.Serializable<TransferFactory_Transfer> & {}

export declare type TransferInstruction_Update = {
    extraActors: damlTypes.Party[]
    extraArgs: Splice_Api_Token_MetadataV1.ExtraArgs
}

export declare const TransferInstruction_Update: damlTypes.Serializable<TransferInstruction_Update> & {}

export declare type TransferInstruction_Withdraw = {
    extraArgs: Splice_Api_Token_MetadataV1.ExtraArgs
}

export declare const TransferInstruction_Withdraw: damlTypes.Serializable<TransferInstruction_Withdraw> & {}

export declare type TransferInstruction_Reject = {
    extraArgs: Splice_Api_Token_MetadataV1.ExtraArgs
}

export declare const TransferInstruction_Reject: damlTypes.Serializable<TransferInstruction_Reject> & {}

export declare type TransferInstruction_Accept = {
    extraArgs: Splice_Api_Token_MetadataV1.ExtraArgs
}

export declare const TransferInstruction_Accept: damlTypes.Serializable<TransferInstruction_Accept> & {}

export declare type TransferInstructionView = {
    originalInstructionCid: damlTypes.Optional<
        damlTypes.ContractId<TransferInstruction>
    >
    transfer: Transfer
    status: TransferInstructionStatus
    meta: Splice_Api_Token_MetadataV1.Metadata
}

export declare const TransferInstructionView: damlTypes.Serializable<TransferInstructionView> & {}

export declare type TransferInstructionStatus =
    | { tag: 'TransferPendingReceiverAcceptance'; value: {} }
    | {
          tag: 'TransferPendingInternalWorkflow'
          value: TransferInstructionStatus.TransferPendingInternalWorkflow
      }

export declare const TransferInstructionStatus: damlTypes.Serializable<TransferInstructionStatus> & {
    TransferPendingInternalWorkflow: damlTypes.Serializable<TransferInstructionStatus.TransferPendingInternalWorkflow>
}

export namespace TransferInstructionStatus {
    type TransferPendingInternalWorkflow = {
        pendingActions: damlTypes.Map<damlTypes.Party, string>
    }
} //namespace TransferInstructionStatus

export declare type TransferInstructionResult_Output =
    | {
          tag: 'TransferInstructionResult_Pending'
          value: TransferInstructionResult_Output.TransferInstructionResult_Pending
      }
    | {
          tag: 'TransferInstructionResult_Completed'
          value: TransferInstructionResult_Output.TransferInstructionResult_Completed
      }
    | { tag: 'TransferInstructionResult_Failed'; value: {} }

export declare const TransferInstructionResult_Output: damlTypes.Serializable<TransferInstructionResult_Output> & {
    TransferInstructionResult_Pending: damlTypes.Serializable<TransferInstructionResult_Output.TransferInstructionResult_Pending>
    TransferInstructionResult_Completed: damlTypes.Serializable<TransferInstructionResult_Output.TransferInstructionResult_Completed>
}

export namespace TransferInstructionResult_Output {
    type TransferInstructionResult_Pending = {
        transferInstructionCid: damlTypes.ContractId<TransferInstruction>
    }
} //namespace TransferInstructionResult_Output

export namespace TransferInstructionResult_Output {
    type TransferInstructionResult_Completed = {
        receiverHoldingCids: damlTypes.ContractId<Splice_Api_Token_HoldingV1.Holding>[]
    }
} //namespace TransferInstructionResult_Output

export declare type TransferInstructionResult = {
    output: TransferInstructionResult_Output
    senderChangeCids: damlTypes.ContractId<Splice_Api_Token_HoldingV1.Holding>[]
    meta: Splice_Api_Token_MetadataV1.Metadata
}

export declare const TransferInstructionResult: damlTypes.Serializable<TransferInstructionResult> & {}

export declare type Transfer = {
    sender: damlTypes.Party
    receiver: damlTypes.Party
    amount: damlTypes.Numeric
    instrumentId: Splice_Api_Token_HoldingV1.InstrumentId
    requestedAt: damlTypes.Time
    executeBefore: damlTypes.Time
    inputHoldingCids: damlTypes.ContractId<Splice_Api_Token_HoldingV1.Holding>[]
    meta: Splice_Api_Token_MetadataV1.Metadata
}

export declare const Transfer: damlTypes.Serializable<Transfer> & {}
