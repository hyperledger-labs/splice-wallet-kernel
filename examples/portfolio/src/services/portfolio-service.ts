// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import type {
    Holding,
    PrettyContract,
    TransferInstructionView,
    Transaction,
} from '@canton-network/core-ledger-client'
import type {
    AllocationInstructionView,
    AllocationRequestView,
    AllocationSpecification,
    AllocationView,
} from '@canton-network/core-token-standard'

// PortfolioService is a fat interface that tries to capture everything our
// portflio can do.  Separating the interface from the implementation will
// hopefully help us when we port the codebase to use web components instead
// of react.
export interface PortfolioService {
    // Holdings
    listHoldings: ({ party }: { party: string }) => Promise<Holding[]>

    // Transfers
    createTransfer: (_: {
        registryUrls: ReadonlyMap<PartyId, string>
        sender: PartyId
        receiver: PartyId
        instrumentId: { admin: PartyId; id: string }
        amount: number
        memo?: string
    }) => Promise<void>
    exerciseTransfer: (_: {
        registryUrls: ReadonlyMap<PartyId, string>
        party: PartyId
        contractId: string
        instrumentId: { admin: string; id: string }
        instructionChoice: 'Accept' | 'Reject' | 'Withdraw'
    }) => Promise<void>
    listPendingTransfers: (_: {
        party: PartyId
    }) => Promise<PrettyContract<TransferInstructionView>[]>

    // Allocations
    createAllocationInstruction: (_: {
        registryUrls: ReadonlyMap<PartyId, string>
        party: PartyId // Party creating the allocation, not necessarily the sender or receiver
        allocationSpecification: AllocationSpecification
    }) => Promise<void>
    listPendingAllocationInstructions: (_: {
        party: PartyId
    }) => Promise<PrettyContract<AllocationInstructionView>[]>
    listPendingAllocationRequests: (_: {
        party: PartyId
    }) => Promise<PrettyContract<AllocationRequestView>[]>
    listPendingAllocations: (_: {
        party: PartyId
    }) => Promise<PrettyContract<AllocationView>[]>

    // History
    getTransactionHistory: (_: { party: PartyId }) => Promise<Transaction[]>
    fetchOlderTransactionHistory: (_: {
        party: PartyId
    }) => Promise<Transaction[]>
    fetchMoreRecentTransactionHistory: (_: {
        party: PartyId
    }) => Promise<Transaction[]>

    // Tap
    tap: (_: {
        registryUrls: ReadonlyMap<PartyId, string>
        party: string
        sessionToken: string
        instrumentId: { admin: string; id: string }
        amount: number
    }) => Promise<void>
}
