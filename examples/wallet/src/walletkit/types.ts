// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { WalletKitTypes } from '@reown/walletkit'

export interface PendingProposal {
    id: number
    peerName: string
    peerUrl: string
    peerDescription: string
    methods: string[]
    events: string[]
    chains: string[]
    receivedAt: string
}

export interface PendingRequest {
    id: number
    topic: string
    method: string
    params: unknown
    peerName: string
    receivedAt: string
}

export interface SessionInfo {
    topic: string
    peerName: string
    peerUrl: string
    expiry: number
}

export interface QueuedProposal {
    raw: WalletKitTypes.SessionProposal
    meta: PendingProposal
    resolve: (result: { networkId: string }) => void
    reject: (error: Error) => void
}

export interface QueuedRequest {
    raw: WalletKitTypes.SessionRequest
    meta: PendingRequest
    resolve: (result: unknown) => void
    reject: (error: Error) => void
}
