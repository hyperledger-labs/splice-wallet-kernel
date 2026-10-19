// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Ops } from '@canton-network/core-provider-ledger'

type AllowedOperation =
    | Ops.PostV2CommandsSubmitAndWait
    | Ops.PostV2InteractiveSubmissionPrepare

type OperationBodyRequest<Operation extends AllowedOperation> =
    Operation['ledgerApi']['params']['body']

type RequiredParamsFor<Operation extends AllowedOperation> = Extract<
    keyof OperationBodyRequest<Operation>,
    Operation extends
        | Ops.PostV2CommandsSubmitAndWait
        | Ops.PostV2InteractiveSubmissionPrepare
        ? 'commands' | 'actAs'
        : never
>
type UnusedParams<Operation extends AllowedOperation> = Extract<
    keyof OperationBodyRequest<Operation>,
    Operation extends
        | Ops.PostV2CommandsSubmitAndWait
        | Ops.PostV2InteractiveSubmissionPrepare
        ? 'userId'
        : never
>

export type InternalOperationParams<Operation extends AllowedOperation> =
    Required<
        Pick<OperationBodyRequest<Operation>, RequiredParamsFor<Operation>>
    > &
        Partial<
            Omit<
                OperationBodyRequest<Operation>,
                UnusedParams<Operation> & RequiredParamsFor<Operation>
            >
        >

type ReassignmentCommandsBody =
    Ops.PostV2CommandsSubmitAndWaitForReassignment['ledgerApi']['params']['body']['reassignmentCommands']

type UnassignCommandValue = Extract<
    NonNullable<ReassignmentCommandsBody['commands'][number]['command']>,
    { UnassignCommand: unknown }
>['UnassignCommand']['value']

export type ReassignParams = Pick<ReassignmentCommandsBody, 'submitter'> &
    Pick<UnassignCommandValue, 'contractId' | 'source' | 'target'>
