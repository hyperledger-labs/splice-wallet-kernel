// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type Kysely, sql } from 'kysely'
import type { DB } from '../../../schema'

export async function insertUserPartyRight(
    db: Kysely<DB>,
    row: {
        userId: string
        networkId: string
        partyId: string
        right: string
    }
): Promise<void> {
    await sql`
        INSERT INTO user_party_rights (user_id, network_id, party_id, "right")
        VALUES (${row.userId}, ${row.networkId}, ${row.partyId}, ${row.right})
    `.execute(db)
}

export async function insertUserRight(
    db: Kysely<DB>,
    row: {
        userId: string
        networkId: string
        right: string
    }
): Promise<void> {
    await sql`
        INSERT INTO user_rights (user_id, network_id, "right")
        VALUES (${row.userId}, ${row.networkId}, ${row.right})
    `.execute(db)
}
