// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/** The state a participant reports for one traffic account. */
export type TrafficAccount = {
    accountId: string
    /** Remaining traffic, in bytes. */
    balance: number
}

export type TopUpTrafficParams = {
    /**
     * The account to credit. Canton currently ties an account id to a party id,
     * so this is a party id until user-defined account ids arrive.
     */
    accountId: string
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
