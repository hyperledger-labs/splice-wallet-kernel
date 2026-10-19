// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { PartyId } from '@canton-network/core-types'
import type { LedgerCommonSchemas } from '@canton-network/core-ledger-client-types'
import type { AcsOptions } from '@canton-network/core-acs-reader'

export type PrepareOptions = {
    partyId: PartyId
    /** A `WrappedCommand`, an array of them, or any other command shape. */
    commands: unknown
    commandId?: string
    synchronizerId?: string
    disclosedContracts?: LedgerCommonSchemas['DisclosedContract'][]
}

export type ExecuteOptions = {
    submissionId?: string
    partyId: PartyId
}

export type AcsRequestOptions = Omit<AcsOptions, 'offset'> & {
    offset?: number
}
