// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Ops } from '@canton-network/core-provider-ledger'
import { TokenProviderConfig } from '@canton-network/core-wallet-auth'

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

export type ParticipantEndpointConfig = {
    url: URL
    tokenProviderConfig: TokenProviderConfig
}

export type GenerateTransactionResponse =
    Ops.PostV2PartiesExternalGenerateTopology['ledgerApi']['result']

export type MultiHashSignatures =
    Ops.PostV2PartiesExternalAllocate['ledgerApi']['params']['body']['multiHashSignatures']

export type OnboardingTransactions =
    Ops.PostV2PartiesExternalAllocate['ledgerApi']['params']['body']['onboardingTransactions']
