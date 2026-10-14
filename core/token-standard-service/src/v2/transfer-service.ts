// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Metadata } from '@canton-network/core-token-standard'
import type { ContractId, Logger, PartyId } from '@canton-network/core-types'
import Decimal from 'decimal.js'
import { TokenStandardService } from '../token-standard-service'
import {
    type DisclosedContract,
    EMPTY_META,
    type ExerciseCommand,
    REQUESTED_AT_SKEW_MS,
} from '../types'
import {
    type Account,
    type TransferFactory_Transfer as TransferFactory_TransferV2,
    type Holding as HoldingV2,
    type OffLedger as OffLedgerV2,
    TRANSFER_FACTORY_INTERFACE_ID_V2,
    TRANSFER_INSTRUCTION_INTERFACE_ID_V2,
    TransferInstruction,
} from '@canton-network/core-token-standard-v2'
import type { CoreService } from '../core-service.js'

export class TransferServiceV2 {
    constructor(
        private core: CoreService,
        private readonly logger: Logger
    ) {}

    public async buildTransferChoiceArgs(opts: {
        sender: Account
        receiver: Account
        amount: string
        instrumentAdmin: PartyId
        instrumentId: string
        inputUtxos?: string[]
        memo?: string
        expiryDate?: Date
        meta?: Metadata
        actors?: PartyId[]
        continueUntilCompletion?: boolean
    }): Promise<TransferFactory_TransferV2> {
        const inputHoldingCids: string[] =
            await this.core.getInputHoldingCidsForAccount({
                account: opts.sender,
                instrumentAdmin: opts.instrumentAdmin,
                instrumentId: opts.instrumentId,
                inputUtxos: opts.inputUtxos ?? [],
                amount: new Decimal(opts.amount),
                continueUntilCompletion: opts.continueUntilCompletion ?? false,
            })

        return {
            //TODO: find a better way to flatmap party ids
            actors:
                opts.actors ??
                [opts.sender.owner, opts.sender.provider].flatMap((partyId) =>
                    partyId != null ? [partyId] : []
                ),
            transfer: {
                sender: opts.sender,
                receiver: opts.receiver,
                amount: opts.amount,
                instrumentId: {
                    admin: opts.instrumentAdmin,
                    id: opts.instrumentId,
                },
                requestedAt: new Date(
                    Date.now() - REQUESTED_AT_SKEW_MS
                ).toISOString(),
                executeBefore: (
                    opts.expiryDate ??
                    new Date(Date.now() + 24 * 60 * 60 * 1000)
                ).toISOString(),
                inputHoldingCids:
                    inputHoldingCids as unknown as ContractId<HoldingV2>[],
                meta: {
                    values: {
                        [TokenStandardService.MEMO_KEY]: opts.memo || '',
                        ...opts.meta?.values,
                    },
                },
            },
            extraArgs: {
                context: { values: {} },
                meta: { values: {} },
            },
        }
    }

    async createTransfer(
        args: Parameters<TransferServiceV2['buildTransferChoiceArgs']>[0],
        registryUrl: URL,
        prefetched?: {
            factoryId: string
            choiceContext: OffLedgerV2.TransferInstructionV2.components['schemas']['ChoiceContext']
        }
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const choiceArgs = await this.buildTransferChoiceArgs(args)
        const { factoryId, choiceContext } =
            prefetched ??
            (await this.core
                .getTokenStandardClientV2(registryUrl)
                .post('/registry/transfer-instruction/v2/transfer-factory', {
                    choiceArguments: choiceArgs as unknown as Record<
                        string,
                        never
                    >,
                    excludeDebugFields: true,
                }))

        return this.createTransferFromContext(
            factoryId,
            choiceArgs,
            choiceContext
        )
    }

    async createTransferFromContext(
        factoryId: string,
        choiceArgs: TransferFactory_TransferV2,
        choiceContext: OffLedgerV2.TransferInstructionV2.components['schemas']['ChoiceContext']
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        this.logger.debug('Creating transfer from pre-fetched context...')
        choiceArgs.extraArgs.context = {
            ...choiceContext.choiceContextData,
            values: choiceContext.choiceContextData?.values ?? {},
        }
        const exercise: ExerciseCommand = {
            templateId: TRANSFER_FACTORY_INTERFACE_ID_V2,
            contractId: factoryId,
            choice: 'TransferFactory_Transfer',
            choiceArgument: choiceArgs,
        }
        return [exercise, choiceContext.disclosedContracts]
    }

    async rejectTransferInstruction(
        transferInstructionCid: string,
        actors: PartyId[],
        registryUrl: URL
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const ctx = await this.core.getTokenStandardClientV2(registryUrl).post(
            '/registry/transfer-instruction/v2/{transferInstructionId}/choice-contexts/reject',
            {
                excludeDebugFields: true,
            },
            { path: { transferInstructionId: transferInstructionCid } }
        )

        return [
            {
                templateId: TRANSFER_INSTRUCTION_INTERFACE_ID_V2,
                contractId: transferInstructionCid,
                choice: TransferInstruction.TransferInstruction_Reject
                    .choiceName,
                choiceArgument: {
                    actors,
                    extraArgs: {
                        context: ctx.choiceContextData,
                        meta: EMPTY_META,
                    },
                },
            },
            ctx.disclosedContracts ?? [],
        ]
    }

    async withdrawTransferInstruction(
        transferInstructionCid: string,
        actors: PartyId[],
        registryUrl: URL
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const ctx = await this.core.getTokenStandardClientV2(registryUrl).post(
            '/registry/transfer-instruction/v2/{transferInstructionId}/choice-contexts/withdraw',
            {
                excludeDebugFields: true,
            },
            { path: { transferInstructionId: transferInstructionCid } }
        )

        return [
            {
                templateId: TRANSFER_INSTRUCTION_INTERFACE_ID_V2,
                contractId: transferInstructionCid,
                choice: TransferInstruction.TransferInstruction_Withdraw
                    .choiceName,
                choiceArgument: {
                    actors,
                    extraArgs: {
                        context: ctx.choiceContextData,
                        meta: EMPTY_META,
                    },
                },
            },
            ctx.disclosedContracts ?? [],
        ]
    }

    async acceptTransferInstruction(
        transferInstructionCid: string,
        actors: PartyId[],
        registryUrl: URL
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const ctx = await this.core.getTokenStandardClientV2(registryUrl).post(
            '/registry/transfer-instruction/v2/{transferInstructionId}/choice-contexts/accept',
            {
                excludeDebugFields: true,
            },
            { path: { transferInstructionId: transferInstructionCid } }
        )

        return [
            {
                templateId: TRANSFER_INSTRUCTION_INTERFACE_ID_V2,
                contractId: transferInstructionCid,
                choice: TransferInstruction.TransferInstruction_Accept
                    .choiceName,
                choiceArgument: {
                    actors,
                    extraArgs: {
                        context: ctx.choiceContextData,
                        meta: EMPTY_META,
                    },
                },
            },
            ctx.disclosedContracts ?? [],
        ]
    }
}
