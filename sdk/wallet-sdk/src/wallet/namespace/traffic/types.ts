// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Ops } from '@canton-network/core-provider-ledger'

/** The state a participant reports for one traffic account. */
export type TrafficAccount =
    Ops.GetV2TrafficAccountsAccountId['ledgerApi']['result']

type UpdateAccountBody =
    Ops.PostV2TrafficAccounts['ledgerApi']['params']['body']

export type TopUpTrafficParams = Omit<
    UpdateAccountBody,
    'balanceDelta' | 'deduplicationId'
> & {
    /** Bytes to add to the balance. A negative value subtracts. */
    balanceDelta: number
    deduplicationId?: string
}
