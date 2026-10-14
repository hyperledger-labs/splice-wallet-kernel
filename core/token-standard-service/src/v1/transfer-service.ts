// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    TRANSFER_FACTORY_INTERFACE_ID,
    TRANSFER_INSTRUCTION_INTERFACE_ID,
    type Metadata,
    FEATURED_APP_DELEGATE_PROXY_INTERFACE_ID,
    type Holding,
    type Beneficiaries,
    type OffLedger,
    TransferInstruction,
} from '@canton-network/core-token-standard'
import type { ContractId, Logger, PartyId } from '@canton-network/core-types'
import { Decimal } from 'decimal.js'
import {
    type CreateTransferChoiceArgs,
    type DisclosedContract,
    type ExerciseCommand,
    REQUESTED_AT_SKEW_MS,
} from '../types.js'
import { TokenStandardService } from '../token-standard-service.js'
import type { CoreService } from '../core-service.js'
export class TransferService {
    constructor(
        private core: CoreService,
        private readonly logger: Logger
    ) {}

    public async buildTransferChoiceArgs(
        sender: PartyId,
        receiver: PartyId,
        amount: string,
        instrumentAdmin: PartyId,
        instrumentId: string,
        inputUtxos?: string[],
        memo?: string,
        expiryDate?: Date,
        meta?: Metadata,
        continueUntilCompletion?: boolean
    ): Promise<CreateTransferChoiceArgs> {
        const inputHoldingCids: string[] = await this.core.getInputHoldingsCids(
            {
                sender,
                instrumentAdmin,
                instrumentId,
                inputUtxos: inputUtxos ?? [],
                amount: new Decimal(amount),
                continueUntilCompletion: continueUntilCompletion ?? false,
            }
        )

        return {
            expectedAdmin: instrumentAdmin,
            transfer: {
                sender,
                receiver,
                amount,
                instrumentId: { admin: instrumentAdmin, id: instrumentId },
                requestedAt: new Date(
                    Date.now() - REQUESTED_AT_SKEW_MS
                ).toISOString(),
                executeBefore: (
                    expiryDate ?? new Date(Date.now() + 24 * 60 * 60 * 1000)
                ).toISOString(),
                inputHoldingCids:
                    inputHoldingCids as unknown as ContractId<Holding>[],
                meta: {
                    values: {
                        [TokenStandardService.MEMO_KEY]: memo || '',
                        ...meta?.values,
                    },
                },
            },
            extraArgs: {
                context: { values: {} },
                meta: { values: {} },
            },
        }
    }

    async fetchTransferFactoryChoiceContext(
        registryUrl: URL,
        choiceArgs: CreateTransferChoiceArgs,
        excludeDebugFields: boolean = true
    ): Promise<
        OffLedger.TransferInstructionV1.components['schemas']['TransferFactoryWithChoiceContext']
    > {
        return await this.core
            .getTokenStandardClient(registryUrl)
            .post('/registry/transfer-instruction/v1/transfer-factory', {
                choiceArguments: choiceArgs as unknown as Record<string, never>,
                excludeDebugFields,
            })
    }

    async createTransferFromContext(
        factoryId: string,
        choiceArgs: CreateTransferChoiceArgs,
        choiceContext: OffLedger.TransferInstructionV1.components['schemas']['ChoiceContext']
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        this.logger.debug('Creating transfer from pre-fetched context...')
        choiceArgs.extraArgs.context = {
            ...choiceContext.choiceContextData,
            values: choiceContext.choiceContextData?.values ?? {},
        }
        const exercise: ExerciseCommand = {
            templateId: TRANSFER_FACTORY_INTERFACE_ID,
            contractId: factoryId,
            choice: 'TransferFactory_Transfer',
            choiceArgument: choiceArgs,
        }
        return [exercise, choiceContext.disclosedContracts]
    }

    // TODO: use named parameters
    async createTransfer(
        sender: PartyId,
        receiver: PartyId,
        amount: string,
        instrumentAdmin: PartyId, // TODO (#907): replace with registry call
        instrumentId: string,
        registryUrl: URL,
        inputUtxos?: string[],
        memo?: string,
        expiryDate?: Date,
        meta?: Metadata,
        prefetchedRegistryChoiceContext?: {
            factoryId: string
            choiceContext: OffLedger.TransferInstructionV1.components['schemas']['ChoiceContext']
        },
        continueUntilCompletion?: boolean
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        try {
            const choiceArgs = await this.buildTransferChoiceArgs(
                sender,
                receiver,
                amount,
                instrumentAdmin,
                instrumentId,
                inputUtxos,
                memo,
                expiryDate,
                meta,
                continueUntilCompletion
            )

            if (prefetchedRegistryChoiceContext) {
                return this.createTransferFromContext(
                    prefetchedRegistryChoiceContext.factoryId,
                    choiceArgs,
                    prefetchedRegistryChoiceContext.choiceContext
                )
            }

            const { factoryId, choiceContext } =
                await this.fetchTransferFactoryChoiceContext(
                    registryUrl,
                    choiceArgs
                )

            return this.createTransferFromContext(
                factoryId,
                choiceArgs,
                choiceContext
            )
        } catch (e) {
            this.logger.error('Failed to execute transfer:', e)
            throw e
        }
    }

    async fetchAcceptTransferInstructionChoiceContext(
        transferInstructionCid: string,
        registryUrl: URL
    ): Promise<{
        choiceContextData: unknown
        disclosedContracts: DisclosedContract[]
    }> {
        const client = this.core.getTokenStandardClient(registryUrl)
        const choiceContext = await client.post(
            '/registry/transfer-instruction/v1/{transferInstructionId}/choice-contexts/accept',
            {
                excludeDebugFields: true,
            },
            {
                path: {
                    transferInstructionId: transferInstructionCid,
                },
            }
        )
        return {
            choiceContextData: choiceContext.choiceContextData,
            disclosedContracts: choiceContext.disclosedContracts,
        }
    }

    async createAcceptTransferInstructionFromContext(
        transferInstructionCid: string,
        choiceContext: {
            choiceContextData: unknown
            disclosedContracts: DisclosedContract[]
        }
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        try {
            const exercise: ExerciseCommand = {
                templateId: TRANSFER_INSTRUCTION_INTERFACE_ID,
                contractId: transferInstructionCid,
                choice: TransferInstruction.TransferInstruction_Accept
                    .choiceName,
                choiceArgument: {
                    extraArgs: {
                        context: choiceContext.choiceContextData,
                        meta: { values: {} },
                    },
                },
            }
            return [exercise, choiceContext.disclosedContracts]
        } catch (e) {
            this.logger.error(
                'Failed to create accept transfer instruction:',
                e
            )
            throw e
        }
    }

    async exerciseDelegateProxyTransferInstructionAccept(
        proxyCid: string,
        transferInstructionCid: string,
        registryUrl: URL,
        featuredAppRightCid: string,
        beneficiaries: Beneficiaries[]
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const [acceptTransferInstructionContext, disclosedContracts] =
            await this.createAcceptTransferInstruction(
                transferInstructionCid,
                registryUrl
            )

        const choiceArgs = {
            cid: acceptTransferInstructionContext.contractId,
            proxyArg: {
                featuredAppRightCid: featuredAppRightCid,
                beneficiaries: beneficiaries,
                choiceArg: acceptTransferInstructionContext.choiceArgument,
            },
        }

        return [
            {
                templateId: FEATURED_APP_DELEGATE_PROXY_INTERFACE_ID,
                contractId: proxyCid,
                choice: 'DelegateProxy_TransferInstruction_Accept',
                choiceArgument: choiceArgs,
            },
            disclosedContracts,
        ]
    }

    async exerciseDelegateProxyTransferInstructionReject(
        proxyCid: string,
        transferInstructionCid: string,
        registryUrl: URL,
        featuredAppRightCid: string,
        beneficiaries: Beneficiaries[]
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const [rejectTransferInstructionContext, disclosedContracts] =
            await this.createRejectTransferInstruction(
                transferInstructionCid,
                registryUrl
            )

        const choiceArgs = {
            cid: rejectTransferInstructionContext.contractId,
            proxyArg: {
                featuredAppRightCid: featuredAppRightCid,
                beneficiaries,
                choiceArg: rejectTransferInstructionContext.choiceArgument,
            },
        }

        return [
            {
                templateId: FEATURED_APP_DELEGATE_PROXY_INTERFACE_ID,
                contractId: proxyCid,
                choice: 'DelegateProxy_TransferInstruction_Reject',
                choiceArgument: choiceArgs,
            },
            disclosedContracts,
        ]
    }

    async exerciseDelegateProxyTransferInstructioWithdraw(
        proxyCid: string,
        transferInstructionCid: string,
        registryUrl: URL,
        featuredAppRightCid: string,
        beneficiaries: Beneficiaries[]
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const [withdrawTransferInstructionContext, disclosedContracts] =
            await this.createWithdrawTransferInstruction(
                transferInstructionCid,
                registryUrl
            )

        const sumOfWeights: number = beneficiaries.reduce(
            (totalWeight, beneficiary) => totalWeight + beneficiary.weight,
            0
        )

        if (sumOfWeights > 1.0) {
            throw new Error('Sum of beneficiary weights is larger than 1.')
        }

        const choiceArgs = {
            cid: withdrawTransferInstructionContext.contractId,
            proxyArg: {
                featuredAppRightCid: featuredAppRightCid,
                beneficiaries,
                choiceArg: withdrawTransferInstructionContext.choiceArgument,
            },
        }

        return [
            {
                templateId: FEATURED_APP_DELEGATE_PROXY_INTERFACE_ID,
                contractId: proxyCid,
                choice: 'DelegateProxy_TransferInstruction_Withdraw',
                choiceArgument: choiceArgs,
            },
            disclosedContracts,
        ]
    }

    async createAcceptTransferInstruction(
        transferInstructionCid: string,
        registryUrl: URL,
        prefetchedRegistryChoiceContext?: OffLedger.TransferInstructionV1.components['schemas']['ChoiceContext']
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        if (prefetchedRegistryChoiceContext) {
            return this.createAcceptTransferInstructionFromContext(
                transferInstructionCid,
                {
                    choiceContextData:
                        prefetchedRegistryChoiceContext.choiceContextData,
                    disclosedContracts:
                        prefetchedRegistryChoiceContext.disclosedContracts,
                }
            )
        }
        const choiceContext =
            await this.fetchAcceptTransferInstructionChoiceContext(
                transferInstructionCid,
                registryUrl
            )
        return this.createAcceptTransferInstructionFromContext(
            transferInstructionCid,
            choiceContext
        )
    }

    async fetchRejectTransferInstructionChoiceContext(
        transferInstructionCid: string,
        registryUrl: URL
    ): Promise<{
        choiceContextData: unknown
        disclosedContracts: DisclosedContract[]
    }> {
        const client = this.core.getTokenStandardClient(registryUrl)
        const choiceContext = await client.post(
            '/registry/transfer-instruction/v1/{transferInstructionId}/choice-contexts/reject',
            {
                excludeDebugFields: true,
            },
            {
                path: {
                    transferInstructionId: transferInstructionCid,
                },
            }
        )
        return {
            choiceContextData: choiceContext.choiceContextData,
            disclosedContracts: choiceContext.disclosedContracts,
        }
    }

    async createRejectTransferInstructionFromContext(
        transferInstructionCid: string,
        choiceContext: {
            choiceContextData: unknown
            disclosedContracts: DisclosedContract[]
        }
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        try {
            const exercise: ExerciseCommand = {
                templateId: TRANSFER_INSTRUCTION_INTERFACE_ID,
                contractId: transferInstructionCid,
                choice: TransferInstruction.TransferInstruction_Reject
                    .choiceName,
                choiceArgument: {
                    extraArgs: {
                        context: choiceContext.choiceContextData,
                        meta: { values: {} },
                    },
                },
            }
            return [exercise, choiceContext.disclosedContracts]
        } catch (e) {
            this.logger.error(
                'Failed to create reject transfer instruction:',
                e
            )
            throw e
        }
    }

    async createRejectTransferInstruction(
        transferInstructionCid: string,
        registryUrl: URL,
        prefetchedRegistryChoiceContext?: OffLedger.TransferInstructionV1.components['schemas']['ChoiceContext']
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        if (prefetchedRegistryChoiceContext) {
            return this.createRejectTransferInstructionFromContext(
                transferInstructionCid,
                {
                    choiceContextData:
                        prefetchedRegistryChoiceContext.choiceContextData,
                    disclosedContracts:
                        prefetchedRegistryChoiceContext.disclosedContracts,
                }
            )
        }
        const choiceContext =
            await this.fetchRejectTransferInstructionChoiceContext(
                transferInstructionCid,
                registryUrl
            )
        return this.createRejectTransferInstructionFromContext(
            transferInstructionCid,
            choiceContext
        )
    }

    async fetchWithdrawTransferInstructionChoiceContext(
        transferInstructionCid: string,
        registryUrl: URL
    ): Promise<{
        choiceContextData: unknown
        disclosedContracts: DisclosedContract[]
    }> {
        const client = this.core.getTokenStandardClient(registryUrl)

        const choiceContext = await client.post(
            '/registry/transfer-instruction/v1/{transferInstructionId}/choice-contexts/withdraw',
            {
                excludeDebugFields: true,
            },
            {
                path: {
                    transferInstructionId: transferInstructionCid,
                },
            }
        )
        return {
            choiceContextData: choiceContext.choiceContextData,
            disclosedContracts: choiceContext.disclosedContracts,
        }
    }

    async createWithdrawTransferInstructionFromContext(
        transferInstructionCid: string,
        choiceContext: {
            choiceContextData: unknown
            disclosedContracts: DisclosedContract[]
        }
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        try {
            const exercise: ExerciseCommand = {
                templateId: TRANSFER_INSTRUCTION_INTERFACE_ID,
                contractId: transferInstructionCid,
                choice: TransferInstruction.TransferInstruction_Withdraw
                    .choiceName,
                choiceArgument: {
                    extraArgs: {
                        context: choiceContext.choiceContextData,
                        meta: { values: {} },
                    },
                },
            }
            return [exercise, choiceContext.disclosedContracts]
        } catch (e) {
            this.logger.error(
                'Failed to create withdraw transfer instruction:',
                e
            )
            throw e
        }
    }

    async createWithdrawTransferInstruction(
        transferInstructionCid: string,
        registryUrl: URL,
        prefetchedRegistryChoiceContext?: OffLedger.TransferInstructionV1.components['schemas']['ChoiceContext']
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        if (prefetchedRegistryChoiceContext) {
            return this.createWithdrawTransferInstructionFromContext(
                transferInstructionCid,
                {
                    choiceContextData:
                        prefetchedRegistryChoiceContext.choiceContextData,
                    disclosedContracts:
                        prefetchedRegistryChoiceContext.disclosedContracts,
                }
            )
        }
        const choiceContext =
            await this.fetchWithdrawTransferInstructionChoiceContext(
                transferInstructionCid,
                registryUrl
            )
        return this.createWithdrawTransferInstructionFromContext(
            transferInstructionCid,
            choiceContext
        )
    }

    async createTransferInstruction(
        transferInstructionCid: string,
        registryUrl: URL,
        instructionChoice: 'Accept' | 'Reject' | 'Withdraw',
        prefetchedRegistryChoiceContext?: OffLedger.TransferInstructionV1.components['schemas']['ChoiceContext']
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        switch (instructionChoice) {
            case 'Accept':
                return this.createAcceptTransferInstruction(
                    transferInstructionCid,
                    registryUrl,
                    prefetchedRegistryChoiceContext
                )
            case 'Reject':
                return this.createRejectTransferInstruction(
                    transferInstructionCid,
                    registryUrl,
                    prefetchedRegistryChoiceContext
                )
            case 'Withdraw':
                return this.createWithdrawTransferInstruction(
                    transferInstructionCid,
                    registryUrl,
                    prefetchedRegistryChoiceContext
                )
        }
    }
}
