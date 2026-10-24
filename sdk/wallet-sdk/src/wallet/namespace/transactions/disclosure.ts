// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { LedgerCommonSchemas } from '@canton-network/core-ledger-client-types'

type DisclosedContract = LedgerCommonSchemas['DisclosedContract']

/**
 * Drops duplicates by contract id.
 *
 * A submission that assembles its disclosures from more than one source -- a
 * registry's choice context, a delegation's own contracts, a counterparty's --
 * can be handed the same contract twice, and the participant rejects a
 * submission that discloses one contract more than once.
 */
export function dedupeDisclosedContracts(
    disclosures: DisclosedContract[]
): DisclosedContract[] {
    return Array.from(
        new Map(
            disclosures.map((disclosure) => [disclosure.contractId, disclosure])
        ).values()
    )
}
