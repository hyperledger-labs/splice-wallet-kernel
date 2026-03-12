// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { AssetBody, WalletSdkContext } from '../../../sdk.js'
import {
    ALLOCATION_INSTRUCTION_INTERFACE_ID,
    ALLOCATION_INTERFACE_ID,
    ALLOCATION_REQUEST_INTERFACE_ID,
    allocationInstructionRegistryTypes,
    AllocationInstructionView,
    AllocationRequestView,
    AllocationSpecification,
    AllocationView,
} from '@canton-network/core-token-standard'
import { PrettyContract } from '@canton-network/core-tx-parser'
import { PreparedCommand } from '../../transactions/types.js'

export type AllocationInstructionCreateParams = {
    allocationSpecification: AllocationSpecification
    instrumentId: string
    registryUrl: URL
    inputUtxos?: string[]
    requestedAt?: string
    prefetchedRegistryChoiceContext?: {
        factoryId: string
        choiceContext: allocationInstructionRegistryTypes['schemas']['ChoiceContext']
    }
}

export type AllocationParams = {
    allocationCid: string
    asset: AssetBody
    prefetchedRegistryChoiceContext?: allocationInstructionRegistryTypes['schemas']['ChoiceContext']
}

export class AllocationService {
    constructor(private readonly sdkContext: WalletSdkContext) {}

    async pending(partyId: PartyId): Promise<PrettyContract<AllocationView>[]> {
        return await this.sdkContext.tokenStandardService.listContractsByInterface<AllocationView>(
            ALLOCATION_INTERFACE_ID,
            partyId
        )
    }

    /**
     * Executes ExecuteTransferAllocation choice on an allocation instruction to execute the allocation
     * @param allocationCid Allocation contract ID
     * @param asset Asset details (used for registry URL and admin info)
     * @param prefetchedRegistryChoiceContext Optional choice context for offline signing
     * @returns Wrapped ExerciseCommand and disclosed contracts
     */
    async execute(params: AllocationParams) {
        const [command, disclosedConctracts] =
            await this.sdkContext.tokenStandardService.allocation.createExecuteTransferAllocation(
                params.allocationCid,
                params.asset.registryUrl,
                params.prefetchedRegistryChoiceContext
            )

        return [{ ExerciseCommand: command }, disclosedConctracts]
    }

    async withdraw(params: AllocationParams) {
        const [command, disclosedConctracts] =
            await this.sdkContext.tokenStandardService.allocation.createWithdrawAllocation(
                params.allocationCid,
                params.asset.registryUrl,
                params.prefetchedRegistryChoiceContext
            )

        return [{ ExerciseCommand: command }, disclosedConctracts]
    }

    async cancel(params: AllocationParams) {
        const [command, disclosedConctracts] =
            await this.sdkContext.tokenStandardService.allocation.createCancelAllocation(
                params.allocationCid,
                params.asset.registryUrl,
                params.prefetchedRegistryChoiceContext
            )

        return [{ ExerciseCommand: command }, disclosedConctracts]
    }

    instruction = {
        pending: async (
            partyId: PartyId
        ): Promise<PrettyContract<AllocationInstructionView>[]> => {
            return await this.sdkContext.tokenStandardService.listContractsByInterface<AllocationInstructionView>(
                ALLOCATION_INSTRUCTION_INTERFACE_ID,
                partyId
            )
        },

        /**
         * Creates an allocation instruction (optionally using pre-fetched registry choice context)
         * @param allocationSpecification Allocation specification to request
         * @param instrumentId Identifier of the asset to allocate
         * @param registryUrl URL of the registry to use for the allocation
         * @param inputUtxos Optional specific UTXOs to consume; auto-selected if omitted
         * @param requestedAt Optional request timestamp (ISO string)
         * @param prefetchedRegistryChoiceContext Optional factory id + choice context to avoid a registry call
         * @returns Wrapped ExerciseCommand and disclosed contracts for submission
         */
        create: async (
            params: AllocationInstructionCreateParams
        ): Promise<PreparedCommand> => {
            const asset = await this.sdkContext.asset.find(
                params.instrumentId,
                params.registryUrl
            )

            if (!asset || asset === undefined) {
                throw new Error(
                    `Asset with id ${params.instrumentId} not found in asset list for registry URL: ${params.registryUrl.href}`
                )
            }

            try {
                const [exercise, disclosed] =
                    await this.sdkContext.tokenStandardService.allocation.createAllocationInstruction(
                        params.allocationSpecification,
                        asset.admin,
                        asset.registryUrl,
                        params.inputUtxos,
                        params.requestedAt,
                        params.prefetchedRegistryChoiceContext
                    )

                return [{ ExerciseCommand: exercise }, disclosed]
            } catch (error) {
                this.sdkContext.logger.error(
                    { error, params },
                    'Failed to create allocation instruction'
                )
                throw error
            }
        },

        withdraw: async (
            allocationInstructionCid: string
        ): Promise<PreparedCommand> => {
            const [command, dc] =
                await this.sdkContext.tokenStandardService.allocation.createWithdrawAllocationInstruction(
                    allocationInstructionCid
                )

            return [{ ExerciseCommand: command }, dc]
        },
    }

    request = {
        /**
         * Fetches all pending allocation requests
         * @returns a promise containing prettyContract for AllocationRequestView.
         */
        pending: async (
            partyId: PartyId
        ): Promise<PrettyContract<AllocationRequestView>[]> => {
            return await this.sdkContext.tokenStandardService.listContractsByInterface<AllocationRequestView>(
                ALLOCATION_REQUEST_INTERFACE_ID,
                partyId
            )
        },

        reject: async (
            allocationRequestCid: string,
            partyId: PartyId
        ): Promise<PreparedCommand> => {
            const [command, dc] =
                await this.sdkContext.tokenStandardService.allocation.createRejectAllocationRequest(
                    allocationRequestCid,
                    partyId
                )
            return [{ ExerciseCommand: command }, dc]
        },
        withdraw: async (
            allocationRequestCid: string
        ): Promise<PreparedCommand> => {
            const [command, dc] =
                await this.sdkContext.tokenStandardService.allocation.createWithdrawAllocationRequest(
                    allocationRequestCid
                )
            return [{ ExerciseCommand: command }, dc]
        },
    }
}
