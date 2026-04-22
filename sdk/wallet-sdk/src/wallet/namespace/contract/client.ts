// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { SDKContext } from '../../sdk.js'
import { Ops } from '@canton-network/core-provider-ledger'
import { SDKLogger } from '../../logger/index.js'

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
}
