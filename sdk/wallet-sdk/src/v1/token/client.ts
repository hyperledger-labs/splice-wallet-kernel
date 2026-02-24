// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { findAsset, WalletSdkContext } from '../sdk.js'
import { TokenStandardService } from '@canton-network/core-token-standard-service'
import { PreparedCommand } from '../transactions/types.js'
import {
    HOLDING_INTERFACE_ID,
    TRANSFER_INSTRUCTION_INTERFACE_ID,
    TransferInstructionView,
    Metadata,
} from '@canton-network/core-token-standard'
import { Holding, PrettyContract } from '@canton-network/core-tx-parser'

/**
 * @param includeLocked defaulted to true, this will include locked UTXOs.
 * @param limit optional limit for number of UTXOs to return.
 * @param offset optional offset to list utxos from, default is latest.
 * @param partyId party to list utxos
 * @param continueUntilCompletion optional search the whole ledger for active contracts. Use only when the amount of contracts exceeds the limit defined in http-list-max-elements-limit
 */
export type ListHoldingsParams = {
    partyId: PartyId
    includeLocked?: boolean
    limit?: number
    offset?: number
    continueUntilCompletion?: boolean
}

export type TransferParams = {
    sender: PartyId
    recipient: PartyId
    amount: string
    instrumentId: string
    registryUrl: URL
    inputUtxos?: string[]
    expirationDate?: Date
    meta?: Metadata
    memo?: string
}

export type TransferAllocationChoiceParams = {
    transferInstructionCid: string
    registryUrl: URL
}

export class Token {
    constructor(private readonly sdkContext: WalletSdkContext) {}

    //TODO: figure out how to not pass in registryUrl
    async accept(params: TransferAllocationChoiceParams) {
        const [ExerciseCommand, disclosedContracts] =
            await this.sdkContext.tokenStandardService.transfer.createAcceptTransferInstruction(
                params.transferInstructionCid,
                params.registryUrl.href
            )
        return [{ ExerciseCommand }, disclosedContracts]
    }

    transfer: TransferService = {
        pending: async (partyId: PartyId) => {
            return await this.sdkContext.tokenStandardService.listContractsByInterface<TransferInstructionView>(
                TRANSFER_INSTRUCTION_INTERFACE_ID,
                partyId
            )
        },
        accept: async (params: TransferAllocationChoiceParams) => {
            const [ExerciseCommand, disclosedContracts] =
                await this.sdkContext.tokenStandardService.transfer.createAcceptTransferInstruction(
                    params.transferInstructionCid,
                    params.registryUrl.href
                )
            return [{ ExerciseCommand }, disclosedContracts]
        },
        withdraw: async (params: TransferAllocationChoiceParams) => {
            const [ExerciseCommand, disclosedContracts] =
                await this.sdkContext.tokenStandardService.transfer.createWithdrawTransferInstruction(
                    params.transferInstructionCid,
                    params.registryUrl.href
                )
            return [{ ExerciseCommand }, disclosedContracts]
        },
        reject: async (params: TransferAllocationChoiceParams) => {
            const [ExerciseCommand, disclosedContracts] =
                await this.sdkContext.tokenStandardService.transfer.createRejectTransferInstruction(
                    params.transferInstructionCid,
                    params.registryUrl.href
                )
            return [{ ExerciseCommand }, disclosedContracts]
        },
        create: async (params: TransferParams) => {
            const asset = findAsset(
                this.sdkContext.assetList,
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
        },
    }

    /**
     * Lists all holding UTXOs for the current party.
     * @param partyId
     * @returns  A promise that resolves to an array of holding UTXOs.
     */
    async utxos(params: ListHoldingsParams) {
        const {
            partyId,
            includeLocked,
            limit,
            offset,
            continueUntilCompletion,
        } = params
        const utxos =
            await this.sdkContext.tokenStandardService.listContractsByInterface<Holding>(
                HOLDING_INTERFACE_ID,
                partyId,
                limit,
                offset,
                continueUntilCompletion
            )

        const currentTime = new Date()

        const filteredUtxos = includeLocked
            ? utxos
            : utxos.filter(
                  (utxo) =>
                      !TokenStandardService.isHoldingLocked(
                          utxo.interfaceViewValue,
                          currentTime
                      )
              )

        return filteredUtxos
    }
}

interface TransferService {
    pending: (
        partyId: PartyId
    ) => Promise<PrettyContract<TransferInstructionView>[]>
    create: (params: TransferParams) => Promise<PreparedCommand>
    accept: (params: TransferAllocationChoiceParams) => Promise<PreparedCommand>

    withdraw: (
        params: TransferAllocationChoiceParams
    ) => Promise<PreparedCommand>
    reject: (params: TransferAllocationChoiceParams) => Promise<PreparedCommand>
}
