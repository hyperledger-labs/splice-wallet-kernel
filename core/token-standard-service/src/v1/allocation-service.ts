// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    ALLOCATION_FACTORY_INTERFACE_ID,
    ALLOCATION_INTERFACE_ID,
    ALLOCATION_REQUEST_INTERFACE_ID,
    ALLOCATION_INSTRUCTION_INTERFACE_ID,
    type AllocationFactory_Allocate,
    type AllocationSpecification,
    type Holding,
    type OffLedger,
} from '@canton-network/core-token-standard'
import type { ContractId, Logger, PartyId } from '@canton-network/core-types'
import {
    type DisclosedContract,
    EMPTY_META,
    type ExerciseCommand,
    REQUESTED_AT_SKEW_MS,
} from '../types.js'
import type { CoreService } from '../core-service.js'

export class AllocationService {
    constructor(
        private core: CoreService,
        private readonly logger: Logger
    ) {}

    public async buildAllocationFactoryChoiceArgs(
        allocationSpecification: AllocationSpecification,
        expectedAdmin: PartyId,
        inputUtxos?: string[],
        requestedAt?: string
    ): Promise<AllocationFactory_Allocate> {
        const allocationSpecificationNormalized: AllocationSpecification = {
            ...allocationSpecification,
            settlement: {
                ...allocationSpecification.settlement,
                meta: allocationSpecification.settlement.meta ?? { values: {} },
            },
            transferLeg: {
                ...allocationSpecification.transferLeg,
                meta: allocationSpecification.transferLeg.meta ?? {
                    values: {},
                },
            },
        }

        const inputHoldingCids = await this.core.getInputHoldingsCids({
            sender: allocationSpecificationNormalized.transferLeg.sender,
            inputUtxos: inputUtxos ?? [],
            instrumentAdmin:
                allocationSpecificationNormalized.transferLeg.instrumentId
                    .admin,
            instrumentId:
                allocationSpecificationNormalized.transferLeg.instrumentId.id,
        })

        return {
            expectedAdmin,
            allocation: allocationSpecificationNormalized,
            requestedAt:
                requestedAt ??
                new Date(Date.now() - REQUESTED_AT_SKEW_MS).toISOString(),
            inputHoldingCids:
                inputHoldingCids as unknown as ContractId<Holding>[],
            extraArgs: {
                context: { values: {} },
                meta: { values: {} },
            },
        }
    }

    async fetchAllocationFactoryChoiceContext(
        registryUrl: URL,
        choiceArgs: AllocationFactory_Allocate,
        excludeDebugFields: boolean = true
    ): Promise<
        OffLedger.AllocationInstructionV1.components['schemas']['FactoryWithChoiceContext']
    > {
        return this.core
            .getTokenStandardClient(registryUrl)
            .post('/registry/allocation-instruction/v1/allocation-factory', {
                choiceArguments: choiceArgs as unknown as Record<string, never>,
                excludeDebugFields,
            })
    }

    async createAllocationInstructionFromContext(
        factoryId: string,
        choiceArgs: AllocationFactory_Allocate,
        choiceContext: OffLedger.AllocationInstructionV1.components['schemas']['ChoiceContext']
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        choiceArgs.extraArgs.context = {
            ...choiceContext.choiceContextData,
            values: choiceContext.choiceContextData?.values ?? {},
        }
        const exercise: ExerciseCommand = {
            templateId: ALLOCATION_FACTORY_INTERFACE_ID,
            contractId: factoryId,
            choice: 'AllocationFactory_Allocate',
            choiceArgument: choiceArgs,
        }
        return [exercise, choiceContext.disclosedContracts]
    }

    async createAllocationInstruction(
        allocationSpecification: AllocationSpecification,
        expectedAdmin: PartyId,
        registryUrl: URL,
        inputUtxos?: string[],
        requestedAt?: string,
        prefetchedRegistryChoiceContext?: {
            factoryId: string
            choiceContext: OffLedger.AllocationInstructionV1.components['schemas']['ChoiceContext']
        }
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const choiceArgs = await this.buildAllocationFactoryChoiceArgs(
            allocationSpecification,
            expectedAdmin,
            inputUtxos,
            requestedAt
        )

        if (prefetchedRegistryChoiceContext) {
            return this.createAllocationInstructionFromContext(
                prefetchedRegistryChoiceContext.factoryId,
                choiceArgs,
                prefetchedRegistryChoiceContext.choiceContext
            )
        }

        const { factoryId, choiceContext } =
            await this.fetchAllocationFactoryChoiceContext(
                registryUrl,
                choiceArgs
            )
        return this.createAllocationInstructionFromContext(
            factoryId,
            choiceArgs,
            choiceContext
        )
    }

    private buildAllocationExerciseWithContext(
        templateId: string,
        contractId: string,
        choice:
            | 'Allocation_ExecuteTransfer'
            | 'Allocation_Withdraw'
            | 'Allocation_Cancel',
        choiceContext: OffLedger.AllocationInstructionV1.components['schemas']['ChoiceContext']
    ): [ExerciseCommand, DisclosedContract[]] {
        const exercise: ExerciseCommand = {
            templateId,
            contractId,
            choice,
            choiceArgument: {
                extraArgs: {
                    context: choiceContext.choiceContextData,
                    meta: EMPTY_META,
                },
            },
        }
        return [exercise, choiceContext.disclosedContracts ?? []]
    }

    async fetchExecuteTransferChoiceContext(
        allocationId: string,
        registryUrl: URL
    ) {
        return this.core.getTokenStandardClient(registryUrl).post(
            '/registry/allocations/v1/{allocationId}/choice-contexts/execute-transfer',
            {
                excludeDebugFields: true,
            },
            {
                path: {
                    allocationId,
                },
            }
        )
    }

    createExecuteTransferAllocationFromContext(
        allocationCid: string,
        choiceContext: OffLedger.AllocationInstructionV1.components['schemas']['ChoiceContext']
    ): [ExerciseCommand, DisclosedContract[]] {
        return this.buildAllocationExerciseWithContext(
            ALLOCATION_INTERFACE_ID,
            allocationCid,
            'Allocation_ExecuteTransfer',
            choiceContext
        )
    }

    async createExecuteTransferAllocation(
        allocationCid: string,
        registryUrl: URL,
        prefetchedRegistryChoiceContext?: OffLedger.AllocationInstructionV1.components['schemas']['ChoiceContext']
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        if (prefetchedRegistryChoiceContext) {
            return this.createExecuteTransferAllocationFromContext(
                allocationCid,
                prefetchedRegistryChoiceContext
            )
        }
        const choiceContext = await this.fetchExecuteTransferChoiceContext(
            allocationCid,
            registryUrl
        )
        return this.createExecuteTransferAllocationFromContext(
            allocationCid,
            choiceContext
        )
    }

    async fetchWithdrawAllocationChoiceContext(
        allocationCid: string,
        registryUrl: URL
    ): Promise<
        OffLedger.AllocationInstructionV1.components['schemas']['ChoiceContext']
    > {
        return this.core.getTokenStandardClient(registryUrl).post(
            '/registry/allocations/v1/{allocationId}/choice-contexts/withdraw',
            {
                excludeDebugFields: true,
            },
            { path: { allocationId: allocationCid } }
        )
    }

    createWithdrawAllocationFromContext(
        allocationCid: string,
        choiceContext: OffLedger.AllocationInstructionV1.components['schemas']['ChoiceContext']
    ): [ExerciseCommand, DisclosedContract[]] {
        return this.buildAllocationExerciseWithContext(
            ALLOCATION_INTERFACE_ID,
            allocationCid,
            'Allocation_Withdraw',
            choiceContext
        )
    }

    async createWithdrawAllocation(
        allocationCid: string,
        registryUrl: URL,
        prefetchedRegistryChoiceContext?: OffLedger.AllocationInstructionV1.components['schemas']['ChoiceContext']
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        if (prefetchedRegistryChoiceContext) {
            return this.createWithdrawAllocationFromContext(
                allocationCid,
                prefetchedRegistryChoiceContext
            )
        }
        const choiceContext = await this.fetchWithdrawAllocationChoiceContext(
            allocationCid,
            registryUrl
        )
        return this.createWithdrawAllocationFromContext(
            allocationCid,
            choiceContext
        )
    }

    async fetchCancelAllocationChoiceContext(
        allocationCid: string,
        registryUrl: URL
    ): Promise<
        OffLedger.AllocationInstructionV1.components['schemas']['ChoiceContext']
    > {
        return this.core.getTokenStandardClient(registryUrl).post(
            '/registry/allocations/v1/{allocationId}/choice-contexts/cancel',
            {
                excludeDebugFields: true,
            },
            { path: { allocationId: allocationCid } }
        )
    }

    createCancelAllocationFromContext(
        allocationCid: string,
        choiceContext: OffLedger.AllocationInstructionV1.components['schemas']['ChoiceContext']
    ): [ExerciseCommand, DisclosedContract[]] {
        return this.buildAllocationExerciseWithContext(
            ALLOCATION_INTERFACE_ID,
            allocationCid,
            'Allocation_Cancel',
            choiceContext
        )
    }

    async createCancelAllocation(
        allocationCid: string,
        registryUrl: URL,
        prefetchedRegistryChoiceContext?: OffLedger.AllocationInstructionV1.components['schemas']['ChoiceContext']
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        if (prefetchedRegistryChoiceContext) {
            return this.createCancelAllocationFromContext(
                allocationCid,
                prefetchedRegistryChoiceContext
            )
        }
        const choiceContext = await this.fetchCancelAllocationChoiceContext(
            allocationCid,
            registryUrl
        )
        return this.createCancelAllocationFromContext(
            allocationCid,
            choiceContext
        )
    }

    async createWithdrawAllocationInstruction(
        allocationInstructionCid: string
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const exercise: ExerciseCommand = {
            templateId: ALLOCATION_INSTRUCTION_INTERFACE_ID,
            contractId: allocationInstructionCid,
            choice: 'AllocationInstruction_Withdraw',
            choiceArgument: {
                extraArgs: {
                    context: { values: {} },
                    meta: { values: {} },
                },
            },
        }
        return [exercise, []]
    }

    async createUpdateAllocationInstruction(
        allocationInstructionCid: string,
        extraActors: PartyId[] = [],
        extraArgsContext: Record<string, unknown> = {},
        extraArgsMeta: Record<string, unknown> = {}
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const exercise: ExerciseCommand = {
            templateId: ALLOCATION_INSTRUCTION_INTERFACE_ID,
            contractId: allocationInstructionCid,
            choice: 'AllocationInstruction_Update',
            choiceArgument: {
                extraActors,
                extraArgs: {
                    context: { values: extraArgsContext },
                    meta: { values: extraArgsMeta },
                },
            },
        }
        return [exercise, []]
    }

    async createRejectAllocationRequest(
        allocationRequestCid: string,
        actor: PartyId
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const exercise: ExerciseCommand = {
            templateId: ALLOCATION_REQUEST_INTERFACE_ID,
            contractId: allocationRequestCid,
            choice: 'AllocationRequest_Reject',
            choiceArgument: {
                actor,
                extraArgs: {
                    context: { values: {} },
                    meta: { values: {} },
                },
            },
        }
        return [exercise, []]
    }

    async createWithdrawAllocationRequest(
        allocationRequestCid: string
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const exercise: ExerciseCommand = {
            templateId: ALLOCATION_REQUEST_INTERFACE_ID,
            contractId: allocationRequestCid,
            choice: 'AllocationRequest_Withdraw',
            choiceArgument: {
                extraArgs: {
                    context: { values: {} },
                    meta: { values: {} },
                },
            },
        }
        return [exercise, []]
    }
}
