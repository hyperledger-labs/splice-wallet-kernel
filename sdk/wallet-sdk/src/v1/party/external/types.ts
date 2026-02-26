// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { GenerateTransactionResponse } from '@canton-network/core-ledger-client'
import { ParticipantEndpointConfig } from '../types.js'

export type CreatePartyOptions = Partial<{
    isAdmin: boolean
    partyHint: string
    confirmingThreshold: number
    synchronizerId?: string
    confirmingParticipantEndpoints: ParticipantEndpointConfig[]
    observingParticipantEndpoints: ParticipantEndpointConfig[]
    localParticipantObservationOnly?: boolean
}>

/**
 * Represents a signed party creation, ready to be allocated on the ledger.
 * Contains both the prepared topology transaction and its cryptographic signature.
 */
export type ExecuteOptions = {
    party: GenerateTransactionResponse
    signature: string
}

/*

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

    */
