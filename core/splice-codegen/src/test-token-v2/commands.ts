// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { TestTokenID, TestTokenV2 } from './dar'

import type { PartyId } from '@canton-network/core-types'
import { generateCommand, type TestTokenHoldingView } from '../common'

import {
    Allocation,
    AllocationFactory,
    AllocationInstruction,
    EventLog,
    type HoldingView,
    SettlementFactory,
    TransferFactory,
    TransferInstruction,
} from '@canton-network/core-token-standard-v2'
import type {
    Transfer,
    Allocation as AllocationT,
    AccountConfig,
} from '@daml.js/test-token-v2/Splice/Testing/Tokens/TestTokenV2'
import type { WrappedCommand } from '@canton-network/core-ledger-client-types'
import type { Token } from '@daml.js/test-token-v2/Splice/Testing/Tokens/TestTokenV2/Holding'
import {
    AllocationFactory as AllocationFactoryV1,
    TransferFactory as TransferFactoryV1,
    TransferInstruction as TransferInstructionV1,
    AllocationInstruction as AllocationInstructionV1,
    Allocation as AllocationV1,
} from '@canton-network/core-token-standard'

const commands = {
    create: {
        v1: {
            allocation: generateCommand.create<AllocationT.TokenAllocationV1>(
                TestTokenV2.Allocation.TokenAllocationV1.templateId
            ),
            allocationInstruction:
                generateCommand.create<AllocationT.TokenAllocationInstructionV1>(
                    TestTokenV2.Allocation.TokenAllocationInstructionV1
                        .templateId
                ),
        },
        rules: generateCommand.create<{ admin: PartyId }>(
            TestTokenV2.TokenRules.templateId
        ),
        transferOffer: generateCommand.create<Transfer.TokenTransferOffer>(
            TestTokenV2.Transfer.TokenTransferOffer.templateId
        ),
        allocation: generateCommand.create<AllocationT.TokenAllocationV2>(
            TestTokenV2.Allocation.TokenAllocationV2.templateId
        ),
        allocationInstruction:
            generateCommand.create<AllocationT.TokenAllocationInstructionV2>(
                TestTokenV2.Allocation.TokenAllocationInstructionV2.templateId
            ),
        accountConfig: generateCommand.create<AccountConfig.AccountConfig>(
            TestTokenV2.AccountConfig.AccountConfig.templateId
        ),
        accountProposal: generateCommand.create<AccountConfig.AccountProposal>(
            TestTokenV2.AccountConfig.AccountProposal.templateId
        ),
        token: (
            holding: TestTokenHoldingView<HoldingView>
        ): WrappedCommand<'CreateCommand'> =>
            generateCommand.create<Token>(TestTokenV2.Holding.Token.templateId)(
                {
                    holding: {
                        meta: { values: {} },
                        lock: null,
                        ...holding,
                        instrumentId: {
                            id: TestTokenID,
                            ...holding.instrumentId,
                        },
                    },
                }
            ),
    },
    exercise: {
        rules: {
            v1: {
                transferFactory_Transfer: generateCommand.exercise(
                    TestTokenV2.TokenRules.templateId,
                    TransferFactoryV1.TransferFactory_Transfer.choiceName
                ),
                transferFactory_PublicFetch: generateCommand.exercise(
                    TestTokenV2.TokenRules.templateId,
                    TransferFactoryV1.TransferFactory_PublicFetch.choiceName
                ),
                allocationFactory_Allocate: generateCommand.exercise(
                    TestTokenV2.TokenRules.templateId,
                    AllocationFactoryV1.AllocationFactory_Allocate.choiceName
                ),
                allocationFactory_PublicFetch: generateCommand.exercise(
                    TestTokenV2.TokenRules.templateId,
                    AllocationFactoryV1.AllocationFactory_PublicFetch.choiceName
                ),
            },
            transferFactory_Transfer: generateCommand.exercise(
                TestTokenV2.TokenRules.templateId,
                TransferFactory.TransferFactory_Transfer.choiceName
            ),
            transferFactory_PublicFetch: generateCommand.exercise(
                TestTokenV2.TokenRules.templateId,
                TransferFactory.TransferFactory_PublicFetch.choiceName
            ),
            allocationFactory_Allocate: generateCommand.exercise(
                TestTokenV2.TokenRules.templateId,
                AllocationFactory.AllocationFactory_Allocate.choiceName
            ),
            allocationFactory_PublicFetch: generateCommand.exercise(
                TestTokenV2.TokenRules.templateId,
                AllocationFactory.AllocationFactory_PublicFetch.choiceName
            ),
            eventLog_HoldingsChange: generateCommand.exercise(
                TestTokenV2.TokenRules.templateId,
                EventLog.EventLog_HoldingsChange.choiceName
            ),
            offerMint: generateCommand.exercise(
                TestTokenV2.TokenRules.templateId,
                TestTokenV2.TokenRules.TokenRules_OfferMint.choiceName
            ),
            settlementFactory_SettleBatch: generateCommand.exercise(
                TestTokenV2.TokenRules.templateId,
                SettlementFactory.SettlementFactory_SettleBatch.choiceName
            ),
            settlementFactory_PublicFetch: generateCommand.exercise(
                TestTokenV2.TokenRules.templateId,
                SettlementFactory.SettlementFactory_PublicFetch.choiceName
            ),
        },
        accountConfig: {
            authorizeTransferInstructionAction: generateCommand.exercise(
                TestTokenV2.AccountConfig.AccountConfig.templateId,
                TestTokenV2.AccountConfig.AccountConfig
                    .AuthorizeTransferInstructionAction.choiceName
            ),
            authorizeAllocationAction: generateCommand.exercise(
                TestTokenV2.AccountConfig.AccountConfig.templateId,
                TestTokenV2.AccountConfig.AccountConfig
                    .AuthorizeAllocationAction.choiceName
            ),
            authorizeAllocationInstructionAction: generateCommand.exercise(
                TestTokenV2.AccountConfig.AccountConfig.templateId,
                TestTokenV2.AccountConfig.AccountConfig
                    .AuthorizeAllocationInstructionAction.choiceName
            ),
        },
        accountPropposal: {
            accept: generateCommand.exercise(
                TestTokenV2.AccountConfig.AccountProposal.templateId,
                TestTokenV2.AccountConfig.AccountProposal.AccountProposal_Accept
                    .choiceName
            ),
            reject: generateCommand.exercise(
                TestTokenV2.AccountConfig.AccountProposal.templateId,
                TestTokenV2.AccountConfig.AccountProposal.AccountProposal_Reject
                    .choiceName
            ),
            withdraw: generateCommand.exercise(
                TestTokenV2.AccountConfig.AccountProposal.templateId,
                TestTokenV2.AccountConfig.AccountProposal
                    .AccountProposal_Withdraw.choiceName
            ),
        },
        allocationInstruction: {
            v1: {
                withdraw: generateCommand.exercise(
                    TestTokenV2.Allocation.TokenAllocationInstructionV1
                        .templateId,
                    AllocationInstructionV1.AllocationInstruction_Withdraw
                        .choiceName
                ),
                update: generateCommand.exercise(
                    TestTokenV2.Allocation.TokenAllocationInstructionV1
                        .templateId,
                    AllocationInstructionV1.AllocationInstruction_Update
                        .choiceName
                ),
            },
            accept: generateCommand.exercise(
                TestTokenV2.Allocation.TokenAllocationInstructionV2.templateId,
                AllocationInstruction.AllocationInstruction_Accept.choiceName
            ),
            withdraw: generateCommand.exercise(
                TestTokenV2.Allocation.TokenAllocationInstructionV2.templateId,
                AllocationInstruction.AllocationInstruction_Withdraw.choiceName
            ),
        },
        allocation: {
            v1: {
                executeTransfer: generateCommand.exercise(
                    TestTokenV2.Allocation.TokenAllocationV1.templateId,
                    AllocationV1.Allocation_ExecuteTransfer.choiceName
                ),
                cancel: generateCommand.exercise(
                    TestTokenV2.Allocation.TokenAllocationV1.templateId,
                    AllocationV1.Allocation_Cancel.choiceName
                ),
                withdraw: generateCommand.exercise(
                    TestTokenV2.Allocation.TokenAllocationV1.templateId,
                    AllocationV1.Allocation_Withdraw.choiceName
                ),
            },
            settle: generateCommand.exercise(
                TestTokenV2.Allocation.TokenAllocationV2.templateId,
                Allocation.Allocation_Settle.choiceName
            ),
            withdraw: generateCommand.exercise(
                TestTokenV2.Allocation.TokenAllocationV2.templateId,
                Allocation.Allocation_Withdraw.choiceName
            ),
            cancel: generateCommand.exercise(
                TestTokenV2.Allocation.TokenAllocationV2.templateId,
                Allocation.Allocation_Cancel.choiceName
            ),
        },
        transferOffer: {
            v1: {
                transferInstruction_Accept: generateCommand.exercise(
                    TestTokenV2.Transfer.TokenTransferOffer.templateId,
                    TransferInstructionV1.TransferInstruction_Accept.choiceName
                ),
                transferInstruction_Reject: generateCommand.exercise(
                    TestTokenV2.Transfer.TokenTransferOffer.templateId,
                    TransferInstructionV1.TransferInstruction_Reject.choiceName
                ),
                transferInstruction_Withdraw: generateCommand.exercise(
                    TestTokenV2.Transfer.TokenTransferOffer.templateId,
                    TransferInstructionV1.TransferInstruction_Withdraw
                        .choiceName
                ),
                transferInstruction_Update: generateCommand.exercise(
                    TestTokenV2.Transfer.TokenTransferOffer.templateId,
                    TransferInstructionV1.TransferInstruction_Update.choiceName
                ),
            },
            transferInstruction_Accept: generateCommand.exercise(
                TestTokenV2.Transfer.TokenTransferOffer.templateId,
                TransferInstruction.TransferInstruction_Accept.choiceName
            ),
            transferInstruction_Reject: generateCommand.exercise(
                TestTokenV2.Transfer.TokenTransferOffer.templateId,
                TransferInstruction.TransferInstruction_Reject.choiceName
            ),
            TransferInstruction_Withdraw: generateCommand.exercise(
                TestTokenV2.Transfer.TokenTransferOffer.templateId,
                TransferInstruction.TransferInstruction_Withdraw.choiceName
            ),
            eventLog_HoldingsChange: generateCommand.exercise(
                TestTokenV2.Transfer.TokenTransferOffer.templateId,
                EventLog.EventLog_HoldingsChange.choiceName
            ),
        },
    },
}

export default commands
