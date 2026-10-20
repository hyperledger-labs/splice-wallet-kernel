// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Ops } from '@canton-network/core-provider-ledger'
import type { SDKContext } from '../../../sdk.js'
import type { PartyId } from '@canton-network/core-types'
import type { SDKLogger } from '../../../logger/logger.js'
import { SynchronizerResolver } from '../../../init/synchronizer.js'

export class InternalPartyNamespace {
    private readonly logger: SDKLogger
    constructor(private readonly ctx: SDKContext) {
        this.logger = ctx.logger.child({ namespace: 'InternalPartyClient' })
    }

    /**
     * Allocates a new internal party on the ledger. If no partyHint is provided, a random UUID will be used.
     * Internal parties use the Canton keys for signing and do not use the interactive submission flow.
     */
    public async allocate(
        params: {
            partyHint?: string
            synchronizerId?: string
            userId?: string
        } = {}
    ): Promise<string> {
        if (params.partyHint) {
            const pIdFingerprint = await this.getParticipantIdFingerprint()

            const fullyQualifiedPartyId = `${params.partyHint}::${pIdFingerprint}`

            const existingParty = await this.checkIfPartyAlreadyExists(
                fullyQualifiedPartyId
            )

            if (existingParty) {
                this.logger.info(
                    `Internal party already allocated with partyHint: ${params.partyHint}. Skipping party creation.`
                )
                return existingParty.party
            }
        }

        const synchronizerId = await SynchronizerResolver.requireSynchronizerId(
            this.ctx,
            params.synchronizerId
        )
        const allocatedParty =
            await this.ctx.ledgerProvider.request<Ops.PostV2Parties>({
                method: 'ledgerApi',
                params: {
                    resource: '/v2/parties',
                    requestMethod: 'post',
                    body: {
                        partyIdHint: params.partyHint ?? crypto.randomUUID(),
                        identityProviderId: '',
                        synchronizerId,
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

    private async getParticipantIdFingerprint(): Promise<string> {
        return (
            await this.ctx.ledgerProvider.request<Ops.GetV2PartiesParticipantId>(
                {
                    method: 'ledgerApi',
                    params: {
                        resource: '/v2/parties/participant-id',
                        requestMethod: 'get',
                    },
                }
            )
        ).participantId
            .split('::')
            .pop()!
    }

    private async checkIfPartyAlreadyExists(partyId: PartyId) {
        const { partyDetails } =
            await this.ctx.ledgerProvider.request<Ops.GetV2PartiesParty>({
                method: 'ledgerApi',
                params: {
                    resource: '/v2/parties/{party}',
                    requestMethod: 'get',
                    path: {
                        party: partyId,
                    },
                    query: {
                        'identity-provider-id': '',
                        parties: [partyId],
                    },
                },
            })

        return partyDetails?.find((p) => p.party === partyId)
    }
}
