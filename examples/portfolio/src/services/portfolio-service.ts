// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import type {
    Holding,
    PrettyContract,
    TransferInstructionView,
} from '@canton-network/core-ledger-client'
import type {
    AllocationInstructionView,
    AllocationRequestView,
    AllocationSpecification,
    AllocationView,
} from '@canton-network/core-token-standard'
import type {
    TransactionHistoryRequest,
    TransactionHistoryResponse,
} from './transaction-history-service'

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
        expiry: Date
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
    listAllocationRequests: (_: {
        party: PartyId
    }) => Promise<PrettyContract<AllocationRequestView>[]>
    createAllocation: (_: {
        registryUrls: ReadonlyMap<PartyId, string>
        party: PartyId // Party creating the allocation, not necessarily the sender or receiver
        allocationSpecification: AllocationSpecification
    }) => Promise<void>
    listAllocations: (_: {
        party: PartyId
    }) => Promise<PrettyContract<AllocationView>[]>
    withdrawAllocation: (_: {
        registryUrls: ReadonlyMap<PartyId, string>
        party: PartyId
        contractId: string
        instrumentId: { admin: string; id: string }
    }) => Promise<void>
    listAllocationInstructions: (_: {
        party: PartyId
    }) => Promise<PrettyContract<AllocationInstructionView>[]>

    // History
    getTransactionHistory: (_: {
        party: PartyId
        request: TransactionHistoryRequest
    }) => Promise<TransactionHistoryResponse>

    // Tap
    tap: (_: {
        registryUrls: ReadonlyMap<PartyId, string>
        party: string
        sessionToken: string
        instrumentId: { admin: string; id: string }
        amount: number
    }) => Promise<void>
}
