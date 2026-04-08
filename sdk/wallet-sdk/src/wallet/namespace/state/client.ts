// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { CommonCtx } from '../../sdk.js'
import { Ops } from '@canton-network/core-provider-ledger'
import { SDKLogger } from '../../logger/index.js'

export type ConnectedSynchronizersOptions = {
    party?: string
    participantId?: string
    identityProviderId?: string
}

export class State {
    private readonly logger: SDKLogger

    constructor(private readonly ctx: CommonCtx) {
        this.logger = ctx.logger.child({ namespace: 'State' })
    }

    /**
     * Returns the list of connected synchronizers for the given party / participant.
     *
     * Calls GET /v2/state/connected-synchronizers with optional query parameters.
     *
     * @param options - Optional filters: party, participantId, identityProviderId.
     */
    public async connectedSynchronizers(
        options?: ConnectedSynchronizersOptions
    ) {
        this.logger.debug({ options }, 'Fetching connected synchronizers')

        const result =
            await this.ctx.ledgerProvider.request<Ops.GetV2StateConnectedSynchronizers>(
                {
                    method: 'ledgerApi',
                    params: {
                        resource: '/v2/state/connected-synchronizers',
                        requestMethod: 'get',
                        query: {
                            ...(options?.party && { party: options.party }),
                            ...(options?.participantId && {
                                participantId: options.participantId,
                            }),
                            ...(options?.identityProviderId && {
                                identityProviderId: options.identityProviderId,
                            }),
                        },
                    },
                }
            )

        return result
    }
}
