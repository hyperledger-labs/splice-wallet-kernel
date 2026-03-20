// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { WalletSdkContext } from '../../sdk.js'
import { v4 } from 'uuid'
import { Ops } from '@canton-network/core-provider-ledger'

type AllowedOperation =
    | Ops.PostV2CommandsSubmitAndWait
    | Ops.PostV2InteractiveSubmissionPrepare

type OperationBodyRequest<Operation extends AllowedOperation> =
    Operation['ledgerApi']['params']['body']

type RequiredParams = 'commands' | 'actAs'
type UnusedParams = 'userId'

type InternalOperationParams<Operation extends AllowedOperation> = Required<
    Pick<OperationBodyRequest<Operation>, RequiredParams>
> &
    Partial<
        Omit<OperationBodyRequest<Operation>, UnusedParams | RequiredParams>
    >

export class InternalPartySubmitterService {
    constructor(private readonly ctx: WalletSdkContext) {}

    async submit(
        args: InternalOperationParams<Ops.PostV2CommandsSubmitAndWait>
    ) {
        const {
            commands,
            synchronizerId = this.ctx.defaultSynchronizerId,
            disclosedContracts = [],
            readAs = [],
            actAs,
            commandId = v4(),
            packageIdSelectionPreference = [],
        } = args
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

    async prepare(
        args: InternalOperationParams<Ops.PostV2InteractiveSubmissionPrepare>
    ) {
        const {
            commands,
            synchronizerId = this.ctx.defaultSynchronizerId,
            disclosedContracts = [],
            readAs = [],
            actAs,
            commandId = v4(),
            packageIdSelectionPreference = [],
            verboseHashing = false,
        } = args
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
