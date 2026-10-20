// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { SDKContext } from '../../../sdk.js'
import type { Ops } from '@canton-network/core-provider-ledger'
import type { InternalOperationParams, ReassignParams } from './types.js'
import { SynchronizerResolver } from '../../../init/synchronizer.js'

export class InternalLedgerNamespace {
    constructor(private readonly ctx: SDKContext) {}

    /**
     * Reassigns a contract from one synchronizer to another.
     * Performs the two-phase Canton reassignment (Unassign → Assign) via
     * `/v2/commands/submit-and-wait-for-reassignment`.
     *
     * TODO #2097
     */
    async reassign(params: ReassignParams): Promise<void> {
        const { submitter, contractId, source, target } = params

        // Phase 1: Unassign
        const unassignResponse = await this.ctx.ledgerProvider
            .request<Ops.PostV2CommandsSubmitAndWaitForReassignment>({
                method: 'ledgerApi',
                params: {
                    resource: '/v2/commands/submit-and-wait-for-reassignment',
                    requestMethod: 'post',
                    body: {
                        reassignmentCommands: {
                            commandId: crypto.randomUUID(),
                            submitter,
                            commands: [
                                {
                                    command: {
                                        UnassignCommand: {
                                            value: {
                                                contractId,
                                                source,
                                                target,
                                            },
                                        },
                                    },
                                },
                            ],
                        },
                        eventFormat: {
                            filtersByParty: { [submitter]: {} },
                            verbose: false,
                        },
                    },
                },
            })
            .catch((originalError: unknown) => {
                if (
                    typeof originalError === 'object' &&
                    originalError !== null &&
                    'code' in originalError &&
                    (originalError as { code: string }).code ===
                        'SUBMITTER_ALWAYS_STAKEHOLDER'
                ) {
                    this.ctx.error.throw({
                        message:
                            `Cannot reassign contract ${contractId} from ${source} to ${target}: ` +
                            `submitter "${submitter}" is not a stakeholder. ` +
                            `Only a stakeholder of the contract may initiate a reassignment.`,
                        type: 'CantonError',
                        originalError: originalError,
                    })
                }

                // TODO #2103 implement proper compensation algorigthms for reassign
                this.ctx.error.throw({
                    message: 'Unexpected error',
                    type: 'Unexpected',
                    originalError,
                })
            })

        const events = unassignResponse.reassignment?.events ?? []
        const unassignedEvent = events.find((e) => 'JsUnassignedEvent' in e)
        if (!unassignedEvent || !('JsUnassignedEvent' in unassignedEvent)) {
            this.ctx.error.throw({
                message: `No unassigned event returned for contract ${contractId} reassignment`,
                type: 'Unexpected',
            })
        }
        const reassignmentId =
            unassignedEvent.JsUnassignedEvent.value.reassignmentId

        // Phase 2: Assign
        await this.ctx.ledgerProvider
            .request<Ops.PostV2CommandsSubmitAndWaitForReassignment>({
                method: 'ledgerApi',
                params: {
                    resource: '/v2/commands/submit-and-wait-for-reassignment',
                    requestMethod: 'post',
                    body: {
                        reassignmentCommands: {
                            commandId: crypto.randomUUID(),
                            submitter,
                            commands: [
                                {
                                    command: {
                                        AssignCommand: {
                                            value: {
                                                reassignmentId,
                                                source,
                                                target,
                                            },
                                        },
                                    },
                                },
                            ],
                        },
                    },
                },
            })
            .catch((e: unknown) => {
                this.ctx.error.throw({
                    message:
                        `Phase 2 (Assign) failed for contract ${contractId} ` +
                        `(reassignmentId: ${reassignmentId}). ` +
                        `The contract is in-flight on source synchronizer "${source}" and must be ` +
                        `assigned to "${target}" using the reassignmentId above.`,
                    type: 'Unexpected',
                    originalError: e,
                })
            })
    }

    public async submit(
        args: InternalOperationParams<Ops.PostV2CommandsSubmitAndWait>
    ) {
        const {
            commands,
            disclosedContracts = [],
            readAs = [],
            actAs,
            commandId = crypto.randomUUID(),
            packageIdSelectionPreference = [],
        } = args
        const synchronizerId = await SynchronizerResolver.requireSynchronizerId(
            this.ctx,
            args.synchronizerId
        )
        const request = {
            commands,
            commandId,
            userId: this.ctx.userId,
            actAs,
            readAs,
            disclosedContracts,
            synchronizerId,
            packageIdSelectionPreference,
        }

        return await this.ctx.ledgerProvider.request<Ops.PostV2CommandsSubmitAndWait>(
            {
                method: 'ledgerApi',
                params: {
                    resource: '/v2/commands/submit-and-wait',
                    requestMethod: 'post',
                    body: request,
                },
            }
        )
    }

    public async prepare(
        args: InternalOperationParams<Ops.PostV2InteractiveSubmissionPrepare>
    ) {
        const {
            commands,
            disclosedContracts = [],
            readAs = [],
            actAs,
            commandId = crypto.randomUUID(),
            packageIdSelectionPreference = [],
            verboseHashing = false,
        } = args
        const synchronizerId = await SynchronizerResolver.requireSynchronizerId(
            this.ctx,
            args.synchronizerId
        )
        const request = {
            commands,
            commandId,
            userId: this.ctx.userId,
            actAs,
            readAs,
            disclosedContracts,
            synchronizerId,
            packageIdSelectionPreference,
            verboseHashing,
        }

        return await this.ctx.ledgerProvider.request<Ops.PostV2InteractiveSubmissionPrepare>(
            {
                method: 'ledgerApi',
                params: {
                    resource: '/v2/interactive-submission/prepare',
                    requestMethod: 'post',
                    body: request,
                },
            }
        )
    }
}
