// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { LedgerCommonSchemas } from '@canton-network/core-ledger-client-types'
import type { SDKErrorHandler } from '../../error/handler.js'

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

/**
 * One contract as a disclosure, refusing one with no blob.
 *
 * Takes whatever carries the four fields a disclosure needs -- an ACS read's
 * flattened contract, a created event off the event query service -- so the
 * same validation covers every way a disclosure is sourced.
 */
export function toDisclosedContract(
    contract: {
        templateId: string
        contractId: string
        createdEventBlob?: string | undefined
        synchronizerId?: string | undefined
    },
    error: SDKErrorHandler
): DisclosedContract {
    if (
        contract.createdEventBlob === undefined ||
        contract.createdEventBlob === ''
    ) {
        error.throw({
            message:
                `Contract ${contract.contractId} came back without a created event blob, ` +
                'so it cannot be disclosed. The reading party has to be a stakeholder on ' +
                'it, and the filter has to ask for the blob.',
            type: 'BadRequest',
        })
    }

    return {
        templateId: contract.templateId,
        contractId: contract.contractId,
        createdEventBlob: contract.createdEventBlob,
        ...(contract.synchronizerId === undefined
            ? {}
            : { synchronizerId: contract.synchronizerId }),
    }
}
