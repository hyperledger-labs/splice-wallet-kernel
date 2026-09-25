// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Ops } from '@canton-network/core-provider-ledger'

/** The state a participant reports for one traffic account. */
export type TrafficAccount =
    Ops.GetV2TrafficAccountsAccountId['ledgerApi']['result']

type UpdateAccountBody = Ops.PostV2TrafficAccounts['ledgerApi']['params']['body']

/**
 * What `topUpTraffic` takes, which is the Ledger API's own update body with two
 * fields restated: the delta is what a top-up is for, so leaving it out is a
 * mistake rather than a no-op update, and the de-duplication id is generated
 * when a caller does not supply one. Everything else comes from the spec, so a
 * field added upstream shows up here rather than being silently dropped.
 */
export type TopUpTrafficParams = Omit<
    UpdateAccountBody,
    'balanceDelta' | 'deduplicationId'
> & {
    /** Bytes to add to the balance. A negative value subtracts. */
    balanceDelta: number
    /**
     * What the participant de-duplicates on: an id it has already applied is
     * ignored, a fresh one applies the delta again. Left out, a new one is
     * generated, which is what a first attempt wants; pass the id of the
     * attempt being retried so a retry cannot credit twice.
     */
    deduplicationId?: string
}
