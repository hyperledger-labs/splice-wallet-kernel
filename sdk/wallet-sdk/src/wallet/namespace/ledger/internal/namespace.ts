// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { SDKContext } from '../../../sdk.js'
import { v4 } from 'uuid'
import { Ops } from '@canton-network/core-provider-ledger'
import { InternalOperationParams } from './types.js'
import { ACS_UPDATE_CONFIG } from '../acs/index.js'

export class InternalLedgerNamespace {
    constructor(private readonly ctx: SDKContext) {}

    public async submit(
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

    public async prepare(
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

    public async flats(args: InternalOperationParams<Ops.PostV2UpdatesFlats>) {
        const { beginExclusive, endInclusive, filter, updateFormat } = args

        const request = {
            beginExclusive,
            endInclusive,
            filter,
            updateFormat,
            verbose: false,
        }

        return await this.ctx.ledgerProvider.request<Ops.PostV2UpdatesFlats>({
            method: 'ledgerApi',
            params: {
                resource: '/v2/updates/flats',
                requestMethod: 'post',
                body: request,
                query: {
                    limit: ACS_UPDATE_CONFIG.maxUpdatesToFetch,
                    stream_idle_timeout_ms: 1000,
                },
            },
        })
    }
}
