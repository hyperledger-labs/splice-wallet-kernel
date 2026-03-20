// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Ops } from '@canton-network/core-provider-ledger'
import { WalletSdkContext } from '../../sdk.js'
import { v4 } from 'uuid'

export class InternalParty {
    constructor(private readonly ctx: WalletSdkContext) {}

    /**
     * Allocates a new internal party on the ledger, if no partyHint is provided a random UUID will be used.
     * Internal parties uses the canton keys for signing and does not use the interactive submission flow.
     */

    async allocate(params: {
        partyHint: string
        synchronizerId?: string
        userId?: string
    }): Promise<string> {
        const allocatedParty =
            await this.ctx.ledgerProvider.request<Ops.PostV2Parties>({
                method: 'ledgerApi',
                params: {
                    resource: '/v2/parties',
                    requestMethod: 'post',
                    body: {
                        partyIdHint: params.partyHint ?? v4(),
                        identityProviderId: '',
                        synchronizerId:
                            params.synchronizerId ??
                            this.ctx.defaultSynchronizerId,
                        userId: params.userId ?? this.ctx.userId,
                    },
                },
            })

        if (!allocatedParty.partyDetails) {
            this.ctx.error.throw({
                message: 'No party details found for internal party',
                type: 'CantonError',
            })
        }

        return allocatedParty.partyDetails.party
    }
}
