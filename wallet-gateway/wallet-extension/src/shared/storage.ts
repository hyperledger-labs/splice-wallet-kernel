// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { AuthContext } from '@canton-network/core-wallet-auth'
import { storage } from 'wxt/utils/storage'

/** The signed-in user's token. The background owns it. */
export const authContextItem = storage.defineItem<AuthContext | undefined>(
    'local:authContext',
    { fallback: undefined }
)

/** A transaction a dApp prepared that waits for the user's approval. */
export interface ApprovalRequest {
    transactionId: string
    commandId: string
}

/** Pending approvals, oldest first. Cleared when the browser closes. */
export const approvalRequestsItem = storage.defineItem<ApprovalRequest[]>(
    'session:approvalRequests',
    { fallback: [] }
)
