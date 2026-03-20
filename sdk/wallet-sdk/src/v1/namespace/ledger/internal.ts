// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PostEndpoint, PostRequest } from '@canton-network/core-ledger-client'
import { WalletSdkContext } from '../../sdk.js'
import { v4 } from 'uuid'
import { Ops } from '@canton-network/core-provider-ledger'

type InternalPartyOperationPaths = Extract<
    PostEndpoint,
    '/v2/commands/submit-and-wait' | '/v2/interactive-submission/prepare'
>

type RequiredParams = 'commands' | 'actAs'
type UnusedParams = 'userId'

export type InternalOperationParams<Path extends InternalPartyOperationPaths> =
    Omit<Partial<PostRequest<Path>>, RequiredParams | UnusedParams> &
        (RequiredParams extends keyof PostRequest<Path>
            ? Required<Pick<PostRequest<Path>, RequiredParams>>
            : never)

export class InternalPartySubmitterService {
    constructor(private readonly ctx: WalletSdkContext) {}

    async submit(
        args: InternalOperationParams<'/v2/commands/submit-and-wait'>
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
        const request: PostRequest<'/v2/commands/submit-and-wait'> = {
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
        args: InternalOperationParams<'/v2/interactive-submission/prepare'>
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
        const request: PostRequest<'/v2/interactive-submission/prepare'> = {
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
