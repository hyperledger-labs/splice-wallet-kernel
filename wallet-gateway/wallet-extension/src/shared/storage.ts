// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { AuthContext } from '@canton-network/core-wallet-auth'
import { storage } from 'wxt/utils/storage'
import type { VaultStatus } from './vault-protocol'

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

/**
 * The vault's status, for pages to watch. Not secret. The background writes it
 * after every change; ask the background (`vault.getStatus`) for the current
 * value, since this item is unset until the background has started.
 */
export const vaultStatusItem = storage.defineItem<VaultStatus>(
    'session:vaultStatus',
    { fallback: 'locked' }
)
