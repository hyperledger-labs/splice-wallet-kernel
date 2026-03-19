// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PostEndpoint, PostRequest } from '@canton-network/core-ledger-client'
import { WalletSdkContext } from '../../sdk.js'
import { v4 } from 'uuid'
import { Ops } from '@canton-network/core-provider-ledger'

type InternalValidatorOperationPaths = Extract<
    PostEndpoint,
    '/v2/commands/submit-and-wait' | '/v2/interactive-submission/prepare'
>

type RequiredParams = 'commands'
type UnusedParams = 'userId'

export type InternalOperationParams<
    Path extends InternalValidatorOperationPaths,
> = Omit<Partial<PostRequest<Path>>, RequiredParams | UnusedParams> &
    (RequiredParams extends keyof PostRequest<Path>
        ? Required<Pick<PostRequest<Path>, RequiredParams>>
        : never)

type InternalValidatorParams = Pick<
    WalletSdkContext,
    'defaultSynchronizerId' | 'userId' | 'ledgerProvider'
> &
    Pick<WalletSdkContext['validator'], 'party'>

export class InternalValidator {
    constructor(private readonly ctx: InternalValidatorParams) {}

    async submit(
        args: InternalOperationParams<'/v2/commands/submit-and-wait'>
    ) {
        const {
            commands,
            synchronizerId,
            disclosedContracts = [],
            readAs = [],
            actAs = [this.ctx.party],
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
            synchronizerId: synchronizerId
                ? synchronizerId
                : this.ctx.defaultSynchronizerId,
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
            synchronizerId,
            disclosedContracts = [],
            readAs = [],
            actAs = [this.ctx.party],
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
            synchronizerId: synchronizerId
                ? synchronizerId
                : this.ctx.defaultSynchronizerId,
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
