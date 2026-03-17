// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { WalletSdkContext } from '../../sdk.js'
import { TokenStandardService } from '@canton-network/core-token-standard-service'
import { PreparedCommand } from '../transactions/types.js'
import {
    HOLDING_INTERFACE_ID,
    TRANSFER_INSTRUCTION_INTERFACE_ID,
    TransferInstructionView,
} from '@canton-network/core-token-standard'
import { Holding, PrettyContract } from '@canton-network/core-tx-parser'
import { AllocationService } from './allocation/index.js'
import { Decimal } from 'decimal.js'
import { WrappedCommand } from '../ledger/types.js'
import { Types } from '@canton-network/core-ledger-client'
import {
    ListHoldingsParams,
    TransferParams,
    TransferAllocationChoiceParams,
    MergeUtxosParams,
} from './types.js'

export class Token {
    public readonly allocation: AllocationService
    constructor(private readonly sdkContext: WalletSdkContext) {
        this.allocation = new AllocationService(sdkContext)
    }

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
        },
    }

    utxos = {
        /**
         * Merges utxos by instrument
         * @param nodeLimit json api maximum elements limit per node, default is 200
         * @param partyId optional partyId to create the transfer command for - use for if acting as a delegate party
         * @param inputUtxos optional utxos to provide as input (e.g. if you're already listing holdings and don't want to repeat the call)
         * @returns an array of exercise commands, where each command can have up to 100 self-transfers
         * these need to be submitted separately as there is a limit of 100 transfers per execution
         */
        merge: async (
            params: MergeUtxosParams
        ): Promise<
            [
                (
                    | WrappedCommand<'ExerciseCommand'>
                    | WrappedCommand<'CreateCommand'>
                )[],
                Types['DisclosedContract'][],
            ]
        > => {
            const utxos =
                params.inputUtxos ??
                (await this.utxos.list({
                    partyId: params.partyId,
                    includeLocked: false,
                    limit: params.nodeLimit ?? 200,
                }))

            const utxoGroupedByInstrument: Record<
                string,
                PrettyContract<Holding>[] | undefined
            > = Object.groupBy(
                utxos,
                (utxo) =>
                    `${utxo.interfaceViewValue.instrumentId.id}::${utxo.interfaceViewValue.instrumentId.admin}` as string
            )

            const transferInputUtxoLimit = 100
            const allTransferResults = []

            for (const group of Object.values(utxoGroupedByInstrument)) {
                if (!group) continue
                const { id: instrumentId } =
                    group[0].interfaceViewValue.instrumentId

                const registryUrl = new URL(
                    (await this.sdkContext.asset.find(instrumentId)).registryUrl
                )

                const transfers = Math.ceil(
                    group.length / transferInputUtxoLimit
                )

                const transferPromises = Array.from(
                    { length: transfers },
                    (_, i) => {
                        const start = i * transferInputUtxoLimit
                        const end = Math.min(
                            start + transferInputUtxoLimit,
                            group.length
                        )

                        const inputUtxos = group.slice(start, end)

                        const accumulatedAmount = inputUtxos.reduce(
                            (a, b) => a.plus(b.interfaceViewValue.amount),
                            new Decimal(0)
                        )

                        return this.transfer.create({
                            sender: params.partyId,
                            recipient: params.partyId,
                            amount: accumulatedAmount.toString(),
                            instrumentId: instrumentId,
                            registryUrl, //change to url,
                            inputUtxos: inputUtxos.map((h) => h.contractId),
                            memo: params.memo ?? 'merge-utxos',
                        })
                    }
                )
                const transferResults = await Promise.all(transferPromises)
                allTransferResults.push(...transferResults)
            }

            const commands = allTransferResults.map(([cmd]) => cmd)
            const disclosedContracts = Array.from(
                new Map(
                    allTransferResults
                        .flatMap(([, dc]) => dc)
                        .map((dc) => [dc.contractId, dc])
                ).values()
            )

            return [commands, disclosedContracts]
        },

        /**
         * Lists all holding UTXOs for the current party.
         * @param partyId
         * @returns  A promise that resolves to an array of holding UTXOs.
         */
        list: async (params: ListHoldingsParams) => {
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
        },
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
