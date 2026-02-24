// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LedgerClient } from '@canton-network/core-ledger-client'
import { PublicKey } from '@canton-network/core-signing-lib'
import { v4 } from 'uuid'
import { WalletSdkContext } from '../../sdk'
import { ParticipantEndpointConfig } from '../types'
import { PreparedPartyCreation } from './prepared'
import { CreatePartyOptions } from './types'
import { SdkLogger } from '../../logger'
import pino from 'pino'

export class ExternalParty {
    private readonly logger: SdkLogger

    constructor(private readonly ctx: WalletSdkContext) {
        this.logger = ctx.logger.child({ namespace: 'ExternalPartyClient' })
    }

    /**
     * Initiates party creation with the given public key.
     * @param publicKey - The public key for the party
     * @param options - Optional configuration (party hint, participant endpoints, thresholds)
     * @returns PreparedPartyCreation builder for chaining sign() and execute()
     */
    public create(publicKey: PublicKey, options?: CreatePartyOptions) {
        const partyCreationPromise = Promise.all([
            this.getParticipantUids(
                options?.observingParticipantEndpoints ?? [],
                options?.isAdmin
            ),
            this.getParticipantUids(
                options?.confirmingParticipantEndpoints ?? [],
                options?.isAdmin
            ),
            this.ctx.ledgerClient.getSynchronizerId(),
        ]).then(
            ([
                otherHostingParticipantUids,
                observingParticipantUids,
                synchronizerId,
            ]) =>
                this.ctx.ledgerClient.generateTopology(
                    synchronizerId,
                    publicKey,
                    options?.partyHint ?? v4(),
                    false,
                    options?.confirmingThreshold ?? 1,
                    otherHostingParticipantUids,
                    observingParticipantUids
                )
        )

        this.logger.info('Prepared party creation successfully.')
        return new PreparedPartyCreation(
            {
                ...this.ctx,
                logger: this.logger,
            },
            partyCreationPromise,
            options
        )
    }

    /**
     * Retrieves participant IDs from the given endpoints by querying their ledger API.
     * @param hostingParticipantConfigs - Participant endpoint configurations to query
     * @param isAdmin - Whether to use admin credentials for the request
     * @returns Array of participant IDs from the endpoints
     */
    private async getParticipantUids(
        hostingParticipantConfigs: ParticipantEndpointConfig[],
        isAdmin = false
    ) {
        return Promise.all(
            hostingParticipantConfigs
                ?.map(
                    (endpoint) =>
                        new LedgerClient({
                            baseUrl: endpoint.url,
                            logger: this.ctx.logger as unknown as pino.Logger, // TODO: remove assertions when not needed anymore
                            isAdmin,
                            accessToken: endpoint.accessToken,
                            accessTokenProvider: endpoint.accessTokenProvider,
                        })
                )
                .map((client) =>
                    client
                        .getWithRetry('/v2/parties/participant-id')
                        .then((res) => res.participantId)
                ) || []
        )
    }
}
