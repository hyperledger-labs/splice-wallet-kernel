// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PublicKey } from '@canton-network/core-signing-lib'
import { v4 } from 'uuid'
import { WalletSdkContext } from '../../sdk.js'
import { ParticipantEndpointConfig } from '../types.js'
import { PreparedPartyCreation } from './prepared.js'
import { CreatePartyOptions } from './types.js'
import { SdkLogger } from '../../logger/index.js'
import { LedgerProvider, Ops } from '@canton-network/core-provider-ledger'

type GenerateTopologyParams = {
    synchronizerId: string
    publicKey: string
    partyHint?: string
    confirmingThreshold?: number
    otherHostingParticipantUids: string[]
    observingParticipantUids: string[]
    localParticipantObservationOnly?: boolean
}

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
            this.resolveParticipantUids(
                options?.observingParticipantEndpoints ?? []
            ),
            this.resolveParticipantUids(
                options?.confirmingParticipantEndpoints ?? []
            ),
            options?.synchronizerId || this.resolveSynchronizerId(),
        ]).then(
            ([
                otherHostingParticipantUids,
                observingParticipantUids,
                synchronizerId,
            ]) =>
                this.generateTopology({
                    synchronizerId,
                    publicKey,
                    partyHint: options?.partyHint ?? v4(),
                    confirmingThreshold: options?.confirmingThreshold ?? 1,
                    otherHostingParticipantUids,
                    observingParticipantUids,
                    localParticipantObservationOnly:
                        options?.localParticipantObservationOnly ?? false,
                })
        )

        this.logger.debug('Prepared party creation successfully.')
        return new PreparedPartyCreation(
            {
                ...this.ctx,
                logger: this.logger,
            },
            partyCreationPromise,
            options
        )
    }

    private async resolveSynchronizerId() {
        const connectedSynchronizers =
            await this.ctx.ledgerProvider.request<Ops.GetV2StateConnectedSynchronizers>(
                {
                    method: 'ledgerApi',
                    params: {
                        resource: '/v2/state/connected-synchronizers',
                        requestMethod: 'get',
                        query: {},
                    },
                }
            )

        if (!connectedSynchronizers.connectedSynchronizers?.[0]) {
            throw new Error('No connected synchronizers found')
        }

        const synchronizerId =
            connectedSynchronizers.connectedSynchronizers[0].synchronizerId
        if (connectedSynchronizers.connectedSynchronizers.length > 1) {
            this.logger.warn(
                `Found ${connectedSynchronizers.connectedSynchronizers.length} synchronizers, defaulting to ${synchronizerId}`
            )
        }

        return synchronizerId
    }

    private async generateTopology(
        params: GenerateTopologyParams
    ): Promise<
        Ops.PostV2PartiesExternalGenerateTopology['ledgerApi']['result']
    > {
        return this.ctx.ledgerProvider.request<Ops.PostV2PartiesExternalGenerateTopology>(
            {
                method: 'ledgerApi',
                params: {
                    resource: '/v2/parties/external/generate-topology',
                    body: {
                        synchronizer: params.synchronizerId,
                        partyHint: params.partyHint ?? v4(),
                        publicKey: {
                            format: 'CRYPTO_KEY_FORMAT_RAW',
                            keyData: params.publicKey,
                            keySpec: 'SIGNING_KEY_SPEC_EC_CURVE25519',
                        },
                        localParticipantObservationOnly:
                            params.localParticipantObservationOnly ?? false,
                        confirmationThreshold: params.confirmingThreshold ?? 1,
                        otherConfirmingParticipantUids:
                            params.otherHostingParticipantUids,
                        observingParticipantUids:
                            params.observingParticipantUids,
                    },
                    requestMethod: 'post',
                },
            }
        )
    }

    /**
     * Retrieves participant IDs from the given endpoints by querying their ledger API.
     * @param hostingParticipantConfigs - Participant endpoint configurations to query
     * @param isAdmin - Whether to use admin credentials for the request
     * @returns Array of participant IDs from the endpoints
     */
    private async resolveParticipantUids(
        hostingParticipantConfigs: ParticipantEndpointConfig[]
    ) {
        return Promise.all(
            hostingParticipantConfigs
                ?.map(
                    (endpoint) =>
                        new LedgerProvider({
                            baseUrl: endpoint.url,
                            accessTokenProvider: endpoint.accessTokenProvider,
                        })
                )
                .map((provider) =>
                    provider
                        .request<Ops.GetV2PartiesParticipantId>({
                            method: 'ledgerApi',
                            params: {
                                resource: '/v2/parties/participant-id',
                                requestMethod: 'get',
                            },
                        })
                        .then((res) => res.participantId)
                ) || []
        )
    }
}
