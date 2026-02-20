// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { GenerateTransactionResponse } from '@canton-network/core-ledger-client'
import { ParticipantEndpointConfig } from 'src/ledgerController'

export type CreatePartyOptions = Partial<{
    isAdmin: boolean
    partyHint: string
    confirmingThreshold: number
    confirmingParticipantEndpoints: ParticipantEndpointConfig[]
    observingParticipantEndpoints: ParticipantEndpointConfig[]
}>

/**
 * Represents a signed party creation, ready to be allocated on the ledger.
 * Contains both the prepared topology transaction and its cryptographic signature.
 */
export type ExecuteOptions = {
    party: GenerateTransactionResponse
    signedHash: string
}
