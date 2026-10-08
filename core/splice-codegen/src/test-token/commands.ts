// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { TestTokenID, TestTokenV1 } from './dar'
import {
    Allocation,
    AllocationFactory,
    type HoldingView,
    TransferFactory,
    TransferInstruction,
} from '@canton-network/core-token-standard'
import type { WrappedCommand } from '@canton-network/core-ledger-client-types'
import { generateCommand, type TestTokenHoldingView } from '../common'
import type {
    Token,
    TokenAllocation,
    TokenRules,
    TokenTransferOffer,
} from './types'

const commands = {
    create: {
        transferOffer: generateCommand.create<TokenTransferOffer>(
            TestTokenV1.TokenTransferOffer.templateId
        ),
        allocation: generateCommand.create<TokenAllocation>(
            TestTokenV1.TokenAllocation.templateId
        ),
        rules: generateCommand.create<TokenRules>(
            TestTokenV1.TokenRules.templateId
        ),
        token: (
            holding: TestTokenHoldingView<HoldingView>
        ): WrappedCommand<'CreateCommand'> =>
            generateCommand.create<Token>(TestTokenV1.Token.templateId)({
                holding: {
                    lock: null,
                    meta: { values: {} },
                    ...holding,
                    instrumentId: {
                        id: TestTokenID,
                        ...holding.instrumentId,
                    },
                },
            }),
    },

    exercise: {
        transferOffer: {
            accept: generateCommand.exercise(
                TestTokenV1.TokenTransferOffer.templateId,
                TransferInstruction.TransferInstruction_Accept.choiceName
            ),
            reject: generateCommand.exercise(
                TestTokenV1.TokenTransferOffer.templateId,
                TransferInstruction.TransferInstruction_Reject.choiceName
            ),
            withdraw: generateCommand.exercise(
                TestTokenV1.TokenTransferOffer.templateId,
                TransferInstruction.TransferInstruction_Withdraw.choiceName
            ),
            update: generateCommand.exercise(
                TestTokenV1.TokenTransferOffer.templateId,
                TransferInstruction.TransferInstruction_Update.choiceName
            ),
        },
        allocation: {
            executeTransfer: generateCommand.exercise(
                TestTokenV1.TokenAllocation.templateId,
                Allocation.Allocation_ExecuteTransfer.choiceName
            ),
            cancel: generateCommand.exercise(
                TestTokenV1.TokenAllocation.templateId,
                Allocation.Allocation_Cancel.choiceName
            ),
            withdraw: generateCommand.exercise(
                TestTokenV1.TokenAllocation.templateId,
                Allocation.Allocation_Withdraw.choiceName
            ),
        },
        rules: {
            transfer: {
                transfer: generateCommand.exercise(
                    TestTokenV1.TokenRules.templateId,
                    TransferFactory.TransferFactory_Transfer.choiceName
                ),
                publicFetch: generateCommand.exercise(
                    TestTokenV1.TokenRules.templateId,
                    TransferFactory.TransferFactory_PublicFetch.choiceName
                ),
            },
            allocation: {
                allocate: generateCommand.exercise(
                    TestTokenV1.TokenRules.templateId,
                    AllocationFactory.AllocationFactory_Allocate.choiceName
                ),
                publicFetch: generateCommand.exercise(
                    TestTokenV1.TokenRules.templateId,
                    AllocationFactory.AllocationFactory_PublicFetch.choiceName
                ),
            },
        },
    },
}

export default commands
