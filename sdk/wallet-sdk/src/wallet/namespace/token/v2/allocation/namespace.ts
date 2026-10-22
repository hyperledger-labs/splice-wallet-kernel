// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    ALLOCATION_INSTRUCTION_INTERFACE_ID_V2,
    ALLOCATION_INTERFACE_ID_V2,
    ALLOCATION_REQUEST_INTERFACE_ID_V2,
    type AllocationInstructionView,
    type AllocationView,
    type AllocationRequestView,
} from '@canton-network/core-token-standard-v2'
import type { TokenNamespaceConfig } from '../../namespace'
import type { PartyId } from '@canton-network/core-types'
import type { PrettyContract } from '@canton-network/core-tx-parser'
import type { PreparedCommand } from '../../../transactions/types.js'
import { parseAssets, ParsedURL } from '../../../utils/url.js'
import {
    actorsFor,
    sameSettlement,
    type AllocationChoiceParams,
    type AllocationContextParams,
    type AllocationInstructionCreateParams,
    type AllocationRequestActionParams,
    type AllocationScanParams,
    type PreparedCommands,
    type SettlementFactoryParams,
} from './types'

export class AllocationNamespace {
    constructor(private readonly sdkContext: TokenNamespaceConfig) {}

    private get service() {
        return this.sdkContext.tokenStandardService.v2.allocation
    }

    private async registryForAdmin(admin: PartyId): Promise<URL> {
        const assets = parseAssets(
            this.sdkContext.commonCtx,
            await this.sdkContext.tokenStandardService.registriesToAssets(
                this.sdkContext.registryUrls
            )
        )

        const asset = assets.find((a) => a.admin === admin)
        if (!asset) {
            throw new Error(
                `No configured registry serves instrument admin ${admin}`
            )
        }
        return asset.registryUrl
    }

    /**
     *
     * @returns  V2 allocations visiable to partyId (as authorizer, executor, or observer)
     */
    async pending<T = AllocationView>(
        partyId: PartyId,
        interfaceId = ALLOCATION_INTERFACE_ID_V2
    ): Promise<PrettyContract<T>[]> {
        return await this.sdkContext.tokenStandardService.listContractsByInterface<T>(
            interfaceId,
            partyId
        )
    }

    async withdraw(params: AllocationChoiceParams): Promise<PreparedCommand> {
        const [command, dc] = await this.service.createAllocationChoice(
            'withdraw',
            params.allocationCid,
            params.actors,
            params.asset.registryUrl,
            params.prefetchedRegistryChoiceContext
        )

        return [{ ExerciseCommand: command }, dc]
    }

    async cancel(params: AllocationChoiceParams): Promise<PreparedCommand> {
        const [command, dc] = await this.service.createAllocationChoice(
            'cancel',
            params.allocationCid,
            params.actors,
            params.asset.registryUrl,
            params.prefetchedRegistryChoiceContext
        )

        return [{ ExerciseCommand: command }, dc]
    }

    /**
     *
     * Polls {@link pending} until every requested transferLegId of a given settlement is covered
     * by visible V2 allocations, then returns those allocations
     *
     * @throws if any requested leg is still uncovered once attempts are exhausted
     */
    async scan(
        params: AllocationScanParams
    ): Promise<PrettyContract<AllocationView>[]> {
        const { logger } = this.sdkContext.commonCtx

        logger.debug(params)
        const {
            partyId,
            settlement,
            transferLegIds,
            requireBothSides = true,
            maxAttempts = 30,
            retryIntervalMs = 1000,
        } = params

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const allocations = (await this.pending(partyId)).filter((a) =>
                sameSettlement(a.interfaceViewValue.settlement, settlement)
            )

            const sidesByLeg = new Map<string, Set<string>>()
            for (const a of allocations) {
                for (const side of a.interfaceViewValue.allocation
                    .transferLegSides) {
                    const sides =
                        sidesByLeg.get(side.transferLegId) ?? new Set<string>()
                    sides.add(side.side)
                    sidesByLeg.set(side.transferLegId, sides)
                }
            }

            const missing = transferLegIds.filter((legId) => {
                const sides = sidesByLeg.get(legId)
                return requireBothSides
                    ? !(sides?.has('SenderSide') && sides?.has('ReceiverSide'))
                    : !sides
            })

            if (missing.length === 0) {
                logger.info(
                    { partyId, transferLegIds },
                    `All requested V2 allocations are visible`
                )
                return allocations
            }

            logger.info(
                { partyId, attempt, maxAttempts, missing },
                'Waiting for allocations to propagate'
            )
            await new Promise((resolve) => setTimeout(resolve, retryIntervalMs))
        }

        throw new Error(
            `Allocations for transfer legs [${transferLegIds.join(
                ', '
            )}] did not propagate to party ${partyId} in time`
        )
    }

    context = {
        withdraw: async (params: AllocationContextParams) => {
            return this.service.fetchAllocationChoiceContext(
                'withdraw',
                params.allocationCid,
                new ParsedURL(this.sdkContext.commonCtx, params.registryUrl)
            )
        },
        cancel: async (params: AllocationContextParams) => {
            return this.service.fetchAllocationChoiceContext(
                'cancel',
                params.allocationCid,
                new ParsedURL(this.sdkContext.commonCtx, params.registryUrl)
            )
        },
    }

    instruction = {
        pending: async (
            partyId: PartyId
        ): Promise<PrettyContract<AllocationInstructionView>[]> => {
            return await this.pending(
                partyId,
                ALLOCATION_INSTRUCTION_INTERFACE_ID_V2
            )
        },

        create: async (
            params: AllocationInstructionCreateParams
        ): Promise<PreparedCommand> => {
            const spec = params.allocationSpecification
            if (spec.admin !== params.asset.admin) {
                throw new Error(
                    `Spec admin ${spec.admin} does not match asset admin from registry ${params.asset.admin}`
                )
            }
            try {
                const [command, disclosedConctracts] =
                    await this.service.createAllocation(
                        {
                            settlement: params.settlement,
                            spec: spec,
                            admin: spec.admin,
                            actors: params.actors,
                            inputUtxos: params.inputUtxos ?? [],
                            requestedAt: params.requestedAt,
                        },
                        params.asset.registryUrl,
                        params.prefetchedRegistryChoiceContext
                    )
                return [{ ExerciseCommand: command }, disclosedConctracts]
            } catch (error) {
                this.sdkContext.commonCtx.logger.error(
                    { error, params },
                    'Failed to create v2 allocation instruction'
                )
                throw error
            }
        },

        withdraw: async (
            allocationInstructionCid: string,
            actors: PartyId[]
        ): Promise<PreparedCommand> => {
            const [command, dc] =
                this.service.createWithdrawAllocationInstruction(
                    allocationInstructionCid,
                    actors
                )

            return [{ ExerciseCommand: command }, dc]
        },

        accept: async (
            allocationInstructionCid: string,
            actors: PartyId[]
        ): Promise<PreparedCommand> => {
            const [command, dc] =
                this.service.createAcceptAllocationInstruction(
                    allocationInstructionCid,
                    actors
                )

            return [{ ExerciseCommand: command }, dc]
        },
    }

    request = {
        pending: async (
            partyId: PartyId
        ): Promise<PrettyContract<AllocationRequestView>[]> => {
            return await this.pending(
                partyId,
                ALLOCATION_REQUEST_INTERFACE_ID_V2
            )
        },

        accept: async (
            params: AllocationRequestActionParams
        ): Promise<PreparedCommands> => {
            const view = params.request.interfaceViewValue
            const actors =
                params.actors ??
                actorsFor(view.availableActions, 'ARA_Accept', params.partyId)
            if (!actors) {
                throw new Error(
                    `${params.partyId} cannot accept allocation request ${params.request.contractId}`
                )
            }

            const [commands, dc] =
                await this.service.createAllocationsForRequest({
                    requestCid: params.request.contractId,
                    request: view,
                    actors,
                    registry: (admin) => this.registryForAdmin(admin),
                })

            return [
                commands.map((ExerciseCommand) => ({ ExerciseCommand })),
                dc,
            ]
        },

        reject: async (
            params: AllocationRequestActionParams
        ): Promise<PreparedCommand> => {
            const actors =
                params.actors ??
                params.request.interfaceViewValue.settlement.executors
            if (!actors) {
                throw new Error(
                    `${params.partyId} cannot accept allocation request ${params.request.contractId}`
                )
            }

            const [command, dc] = this.service.createAllocationRequestChoice(
                'reject',
                params.request.contractId,
                actors
            )
            return [{ ExerciseCommand: command }, dc]
        },

        withdraw: async (
            params: Omit<AllocationRequestActionParams, 'partyId'>
        ): Promise<PreparedCommand> => {
            const actors =
                params.actors ??
                params.request.interfaceViewValue.settlement.executors

            const [command, dc] = this.service.createAllocationRequestChoice(
                'withdraw',
                params.request.contractId,
                actors
            )
            return [{ ExerciseCommand: command }, dc]
        },
    }

    settlement = {
        factory: async (params: SettlementFactoryParams) =>
            this.service.fetchSettlementFactory(
                params.args,
                new ParsedURL(this.sdkContext.commonCtx, params.registryUrl)
            ),
    }
}
