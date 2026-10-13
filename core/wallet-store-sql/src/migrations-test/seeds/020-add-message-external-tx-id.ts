// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type Kysely, sql } from 'kysely'
import type { DB } from '../../schema.js'

export async function insertMessageRaw(
    db: Kysely<DB>,
    row: {
        id: string
        status: string
        partyId: string
        publicKey: string
        message: string
        userId: string
        networkId: string
        createdAt: string
        externalTxId?: string | null
        failureReason?: string | null
        origin?: string | null
        signedAt?: string | null
        signature?: string | null
    }
): Promise<void> {
    await sql`
        INSERT INTO messages_raw (
            id, status, party_id, public_key, message, origin,
            user_id, network_id, created_at, signed_at, signature,
            external_tx_id, failure_reason
        )
        VALUES (
            ${row.id},
            ${row.status},
            ${row.partyId},
            ${row.publicKey},
            ${row.message},
            ${row.origin ?? null},
            ${row.userId},
            ${row.networkId},
            ${row.createdAt},
            ${row.signedAt ?? null},
            ${row.signature ?? null},
            ${row.externalTxId ?? null},
            ${row.failureReason ?? null}
        )
    `.execute(db)
}
