// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { WalletSdkContext } from '../../../sdk.js'
import { PartyId } from '@canton-network/core-types'
import {
    TRANSFER_INSTRUCTION_INTERFACE_ID,
    TransferInstructionView,
} from '@canton-network/core-token-standard'
import { TransferAllocationChoiceParams, TransferParams } from './types.js'
import { PreparedCommand } from '../../transactions/types.js'

export class TransferService {
    constructor(private readonly sdkContext: WalletSdkContext) {}

    async pending(partyId: PartyId) {
        return await this.sdkContext.tokenStandardService.listContractsByInterface<TransferInstructionView>(
            TRANSFER_INSTRUCTION_INTERFACE_ID,
            partyId
        )
    }

    async accept(
        params: TransferAllocationChoiceParams
    ): Promise<PreparedCommand> {
        const [ExerciseCommand, disclosedContracts] =
            await this.sdkContext.tokenStandardService.transfer.createAcceptTransferInstruction(
                params.transferInstructionCid,
                params.registryUrl.href
            )
        return [{ ExerciseCommand }, disclosedContracts]
    }

    async withdraw(
        params: TransferAllocationChoiceParams
    ): Promise<PreparedCommand> {
        const [ExerciseCommand, disclosedContracts] =
            await this.sdkContext.tokenStandardService.transfer.createWithdrawTransferInstruction(
                params.transferInstructionCid,
                params.registryUrl.href
            )
        return [{ ExerciseCommand }, disclosedContracts]
    }

    async reject(
        params: TransferAllocationChoiceParams
    ): Promise<PreparedCommand> {
        const [ExerciseCommand, disclosedContracts] =
            await this.sdkContext.tokenStandardService.transfer.createRejectTransferInstruction(
                params.transferInstructionCid,
                params.registryUrl.href
            )
        return [{ ExerciseCommand }, disclosedContracts]
    }

    async create(params: TransferParams): Promise<PreparedCommand> {
        const asset = await this.sdkContext.asset.find(
            params.instrumentId,
            params.registryUrl
        )

        if (!asset || asset === undefined) {
            throw new Error(
                `Asset with id ${params.instrumentId} not found in asset list for registry URL: ${params.registryUrl.href}`
            )
        }

        const [transferCommand, disclosedContracts] =
            await this.sdkContext.tokenStandardService.transfer.createTransfer(
                params.sender,
                params.recipient,
                params.amount,
                asset.admin,
                asset.id,
                asset.registryUrl,
                params.inputUtxos,
                params.memo,
                params.expirationDate,
                params.meta
            )

        return [{ ExerciseCommand: transferCommand }, disclosedContracts]
    }
}
