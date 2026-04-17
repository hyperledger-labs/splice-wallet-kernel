// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { SDKContext } from '../../sdk.js'
import { Ops } from '@canton-network/core-provider-ledger'
import { SDKLogger } from '../../logger/index.js'
import { v4 } from 'uuid'

/**
 * Options for assigning a contract to a target participant node.
 */
export type AssignContractOptions = {
    /** The ID from the unassigned event to be completed by this assignment. Required. */
    reassignmentId: string
    /** The ID of the source participant. Required. */
    source: string
    /** The ID of the target participant. Required. */
    target: string
    /** Party on whose behalf the command should be executed. Required. */
    submitter: string
    /** Identifier of the on-ledger workflow. Optional. */
    workflowId?: string
    /** Unique command identifier. Defaults to a generated UUID. Optional. */
    commandId?: string
    /** Unique submission identifier. Optional. */
    submissionId?: string
}

/**
 * Options for unassigning a contract from a source participant.
 */
export type UnassignContractOptions = {
    /** The ID of the contract to unassign. Required. */
    contractId: string
    /** The ID of the source participant. Required. */
    source: string
    /** The ID of the target participant. Required. */
    target: string
    /** Party on whose behalf the command should be executed. Required. */
    submitter: string
    /** Identifier of the on-ledger workflow. Optional. */
    workflowId?: string
    /** Unique command identifier. Defaults to a generated UUID. Optional. */
    commandId?: string
    /** Unique submission identifier. Optional. */
    submissionId?: string
    /**
     * Event format specification for the response.
     * If provided, the response will include reassignment events
     * (e.g. JsUnassignedEvent with reassignmentId).
     * If omitted, the response events array will be empty.
     * Optional.
     */
    eventFormat?: Ops.PostV2CommandsSubmitAndWaitForReassignment['ledgerApi']['params']['body']['eventFormat']
}

export class Contracts {
    private readonly logger: SDKLogger

    constructor(private readonly ctx: SDKContext) {
        this.logger = ctx.logger.child({ namespace: 'Contracts' })
    }

    /**
     * Assigns a contract to a target participant.
     *
     * Calls POST /v2/commands/submit-and-wait-for-reassignment with an AssignCommand.
     *
     * @param options - Parameters for the assign command.
     * @returns The reassignment response from the ledger.
     */
    public async assignContract(
        options: AssignContractOptions
    ): Promise<
        Ops.PostV2CommandsSubmitAndWaitForReassignment['ledgerApi']['result']
    > {
        this.logger.debug({ options }, 'Assigning contract')

        const commandId = options.commandId ?? (v4() as string)

        return await this.ctx.ledgerProvider.request<Ops.PostV2CommandsSubmitAndWaitForReassignment>(
            {
                method: 'ledgerApi',
                params: {
                    resource: '/v2/commands/submit-and-wait-for-reassignment',
                    requestMethod: 'post',
                    body: {
                        reassignmentCommands: {
                            ...(options.workflowId !== undefined && {
                                workflowId: options.workflowId,
                            }),
                            userId: this.ctx.userId,
                            commandId,
                            submitter: options.submitter,
                            ...(options.submissionId !== undefined && {
                                submissionId: options.submissionId,
                            }),
                            commands: [
                                {
                                    command: {
                                        AssignCommand: {
                                            value: {
                                                reassignmentId:
                                                    options.reassignmentId,
                                                source: options.source,
                                                target: options.target,
                                            },
                                        },
                                    },
                                },
                            ],
                        },
                    },
                },
            }
        )
    }

    /**
     * Unassigns a contract from a source participant.
     *
     * Calls POST /v2/commands/submit-and-wait-for-reassignment with an UnassignCommand.
     *
     * @param options - Parameters for the unassign command.
     * @returns The reassignment response from the ledger.
     */
    public async unassignContract(
        options: UnassignContractOptions
    ): Promise<
        Ops.PostV2CommandsSubmitAndWaitForReassignment['ledgerApi']['result']
    > {
        this.logger.debug({ options }, 'Unassigning contract')

        const commandId = options.commandId ?? v4()

        const result =
            await this.ctx.ledgerProvider.request<Ops.PostV2CommandsSubmitAndWaitForReassignment>(
                {
                    method: 'ledgerApi',
                    params: {
                        resource:
                            '/v2/commands/submit-and-wait-for-reassignment',
                        requestMethod: 'post',
                        body: {
                            reassignmentCommands: {
                                ...(options.workflowId !== undefined && {
                                    workflowId: options.workflowId,
                                }),
                                userId: this.ctx.userId,
                                commandId,
                                submitter: options.submitter,
                                ...(options.submissionId !== undefined && {
                                    submissionId: options.submissionId,
                                }),
                                commands: [
                                    {
                                        command: {
                                            UnassignCommand: {
                                                value: {
                                                    contractId:
                                                        options.contractId,
                                                    source: options.source,
                                                    target: options.target,
                                                },
                                            },
                                        },
                                    },
                                ],
                            },
                            ...(options.eventFormat !== undefined && {
                                eventFormat: options.eventFormat,
                            }),
                        },
                    },
                }
            )

        return result
    }
}
